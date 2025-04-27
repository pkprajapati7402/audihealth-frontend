import React, { useState, useRef, useEffect } from "react";
import { Send, Mic, Volume2 } from "lucide-react";
import ReactMarkdown from "react-markdown";

// Import Web Speech API for Speech Recognition and Text-to-Speech
const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = SpeechRecognition ? new SpeechRecognition() : null;

const ChatMessage = ({ message, isUser }) => {
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-pink-500 flex items-center justify-center text-white mr-2">
          AB
        </div>
      )}
      <div className={`max-w-[80%] ${isUser ? "order-1" : "order-2"}`}>
        <div className="flex flex-col">
          <div
            className={`p-3 rounded-lg ${
              isUser ? "bg-pink-500 text-white" : "bg-pink-50"
            }`}
          >
            <ReactMarkdown className={`markdown ${isUser ? "text-white" : "text-gray-900"}`}>
              {message.content}
            </ReactMarkdown>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-gray-500">{message.timestamp}</span>
            {message.status && <span className="text-xs text-pink-500">✓</span>}
          </div>
        </div>
      </div>
      {isUser && <div className="w-8 h-8 rounded-full bg-gray-200 ml-2" />}
    </div>
  );
};

const AudiBuddy = () => {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeakingEnabled, setIsSpeakingEnabled] = useState(true); // State to toggle bot speaking
  const messagesEndRef = useRef(null);

  const API_URL = "https://api.groq.com/openai/v1/chat/completions";
  const API_KEY = "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";

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const SYSTEM_PROMPT = `
You are AudiBuddy, an AI assistant for the AudiHealth project. Your primary role is to provide professional advice and support related to:
- Vocal health and hygiene.
- Voice-related medical conditions (e.g., laryngitis, vocal polyps).
- Speech therapy exercises and techniques.
- Acoustic analysis and diagnostic insights.
- Recommendations for maintaining a healthy voice.

You are empathetic, professional, and focused on vocal health. If asked about unrelated topics, politely redirect the user to voice-related topics. Always maintain the context of the conversation to provide personalized and relevant responses.

Additionally, you are aware of the AudiHealth platform's features, such as:
- Generating detailed voice pathology reports.
- Analyzing acoustic features like jitter, shimmer, and harmonic ratios.
- Providing recommendations for treatment and follow-up.

If the user asks about their voice analysis or diagnostic reports, explain the process and guide them on how to upload audio for analysis. Always ensure your responses are clear, concise, and helpful.
`;

  const handleSend = async () => {
    if (inputValue.trim() && !isLoading) {
      const userMessage = {
        type: "text",
        content: inputValue,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        status: true,
      };

      setMessages((prev) => [...prev, userMessage]);
      setInputValue("");
      setIsLoading(true);

      try {
        const response = await fetch(API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${API_KEY}`,
          },
          body: JSON.stringify({
            model: "meta-llama/llama-4-scout-17b-16e-instruct",
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              { role: "user", content: inputValue },
            ],
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        const botMessage = {
          type: "text",
          content: data.choices[0].message.content,
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          status: false,
        };

        setMessages((prev) => [...prev, botMessage]);

        // Play the bot's response if speaking is enabled
        if (isSpeakingEnabled) {
          playBotResponse(botMessage.content);
        }
      } catch (error) {
        console.error("Error:", error);
        const errorMessage = {
          type: "text",
          content: "Sorry, I encountered an error. Please try again.",
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          status: false,
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const startListening = () => {
    if (!recognition) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    recognition.lang = "en-US";
    recognition.start();
    setIsListening(true);

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInputValue(transcript);
      setIsListening(false);
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };
  };

  const playBotResponse = (text) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    window.speechSynthesis.speak(utterance);
  };

  const toggleSpeaking = () => {
    setIsSpeakingEnabled((prev) => !prev);
  };

  return (
    <div className="flex flex-col h-screen w-full mx-auto">
      <div className="flex items-center justify-between p-4 border-b border-pink-100">
        <div className="flex items-center gap-4">
          <Mic className="w-6 h-6 text-pink-500" />
          <h1 className="text-xl font-bold text-gray-900">AudiBuddy</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {messages.map((message, index) => (
          <ChatMessage key={index} message={message} isUser={index % 2 === 0} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-pink-100 p-4">
        <div className="flex items-center gap-2 bg-pink-50 rounded-lg p-2">
          <button
            onClick={startListening}
            className={`p-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors ${
              isListening ? "opacity-50 cursor-not-allowed" : ""
            }`}
            disabled={isListening}
          >
            <Mic className="w-5 h-5" />
          </button>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Ask about your voice health..."
            className="flex-1 bg-transparent outline-none placeholder-gray-500"
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            className={`p-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors ${
              isLoading ? "opacity-50 cursor-not-allowed" : ""
            }`}
            disabled={isLoading}
          >
            <Send className="w-5 h-5" />
          </button>
          <button
            onClick={toggleSpeaking}
            className={`p-2 ${
              isSpeakingEnabled ? "bg-green-500" : "bg-gray-500"
            } text-white rounded-lg hover:bg-green-600 transition-colors`}
          >
            <Volume2 className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AudiBuddy;
