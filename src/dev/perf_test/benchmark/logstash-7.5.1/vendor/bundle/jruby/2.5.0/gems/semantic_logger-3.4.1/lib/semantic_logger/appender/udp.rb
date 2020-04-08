require 'socket'
module SemanticLogger
  module Appender
    # UDP log appender.
    #
    # Write log messages to UDP.
    # By default messages are in JSON format.
    #
    # Example:
    #   SemanticLogger.add_appender(
    #     appender: :udp,
    #     server:   'server:3300',
    #   )
    class Udp < SemanticLogger::Subscriber
      attr_accessor :server, :udp_flags
      attr_reader :socket

      # Create UDP log appender.
      #
      #   server: [String]
      #     URL of the server to write UDP messages to.
      #
      #   udp_flags: [Integer]
      #     Should be a bitwise OR of Socket::MSG_* constants.
      #     Default: 0
      #
      # Common Appender Parameters:
      #   application: [String]
      #     Name of this application to appear in log messages.
      #     Default: SemanticLogger.application
      #
      #   host: [String]
      #     Name of this host to appear in log messages.
      #     Default: SemanticLogger.host
      #
      #   level: [:trace | :debug | :info | :warn | :error | :fatal]
      #     Override the log level for this appender.
      #     Default: SemanticLogger.default_level
      #
      #   formatter: [Object|Proc]
      #     An instance of a class that implements #call, or a Proc to be used to format
      #     the output from this appender
      #     Default: Use the built-in formatter (See: #call)
      #
      #   filter: [Regexp|Proc]
      #     RegExp: Only include log messages where the class name matches the supplied.
      #     regular expression. All other messages will be ignored.
      #     Proc: Only include log messages where the supplied Proc returns true
      #           The Proc must return true or false.
      #
      # Limitations:
      # * UDP packet size is limited by the connected network and any routers etc
      #   that the message has to traverse. See https://en.wikipedia.org/wiki/Maximum_transmission_unit
      #
      # Example:
      #   SemanticLogger.add_appender(
      #     appender: :udp,
      #     server:   'server:3300'
      #   )
      def initialize(options = {}, &block)
        options    = options.dup
        @server    = options.delete(:server)
        @udp_flags = options.delete(:udp_flags) || 0
        raise(ArgumentError, 'Missing mandatory argument: :server') unless @server

        super(options, &block)
        reopen
      end

      # After forking an active process call #reopen to re-open
      # open the handles to resources
      def reopen
        close
        @socket    = UDPSocket.new
        host, port = server.split(':')
        @socket.connect(host, port.to_i)
      end

      # Write the log using the specified protocol and server.
      def log(log)
        return false unless should_log?(log)

        @socket.send(formatter.call(log, self), udp_flags)
        true
      end

      # Flush is called by the semantic_logger during shutdown.
      def flush
        @socket.flush if @socket
      end

      # Close is called during shutdown, or with reopen
      def close
        @socket.close if @socket
      end

      private

      # Returns [SemanticLogger::Formatters::Default] formatter default for this Appender
      def default_formatter
        SemanticLogger::Formatters::Json.new
      end

    end
  end
end
