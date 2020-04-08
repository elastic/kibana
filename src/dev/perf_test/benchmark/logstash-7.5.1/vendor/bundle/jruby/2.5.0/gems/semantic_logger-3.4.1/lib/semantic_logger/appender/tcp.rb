begin
  require 'net/tcp_client'
rescue LoadError
  raise 'Gem net_tcp_client is required for logging over TCP. Please add the gem "net_tcp_client" to your Gemfile.'
end

raise 'Net::TCPClient v2.0 or greater is required to log over TCP' unless Net::TCPClient::VERSION.to_f >= 2.0

module SemanticLogger
  module Appender
    # TCP log appender.
    #
    # Log to a server over a TCP Socket.
    # By default messages are in JSON format.
    #
    # Features:
    # * JSON Formatted messages.
    # * SSL encryption.
    # * Transparently reconnect when a connection is lost.
    #
    # Example:
    #   SemanticLogger.add_appender(
    #     appender: :tcp,
    #     server:   'server:3300',
    #   )
    #
    # Example, with connection retry options:
    #   SemanticLogger.add_appender(
    #     appender:               :tcp,
    #     server:                 'server:3300',
    #     connect_retry_interval: 0.1,
    #     connect_retry_count:    5
    #   )
    #
    # Example, with SSL enabled:
    #   SemanticLogger.add_appender(
    #     appender: :tcp,
    #     server:   'server:3300',
    #     ssl:      true
    #   )
    #
    class Tcp < SemanticLogger::Subscriber
      attr_accessor :separator
      attr_reader :tcp_client

      # Create TCP log appender.
      #
      # Net::TCPClient Parameters:
      #   :server [String]
      #     URL of the server to connect to with port number
      #     'localhost:2000'
      #     '192.168.1.10:80'
      #
      #   :servers [Array of String]
      #     Array of URL's of servers to connect to with port numbers
      #     ['server1:2000', 'server2:2000']
      #
      #     The second server will only be attempted once the first server
      #     cannot be connected to or has timed out on connect
      #     A read failure or timeout will not result in switching to the second
      #     server, only a connection failure or during an automatic reconnect
      #
      #   :connect_timeout [Float]
      #     Time in seconds to timeout when trying to connect to the server
      #     A value of -1 will cause the connect wait time to be infinite
      #     Default: Half of the :read_timeout ( 30 seconds )
      #
      #   :read_timeout [Float]
      #     Time in seconds to timeout on read
      #     Can be overridden by supplying a timeout in the read call
      #     Default: 60
      #
      #   :write_timeout [Float]
      #     Time in seconds to timeout on write
      #     Can be overridden by supplying a timeout in the write call
      #     Default: 60
      #
      #   :log_level [Symbol]
      #     Optional: Set the logging level for the TCPClient
      #     Any valid SemanticLogger log level:
      #       :trace, :debug, :info, :warn, :error, :fatal
      #     Default: SemanticLogger.default_level
      #
      #   :buffered [Boolean]
      #     Whether to use Nagle's Buffering algorithm (http://en.wikipedia.org/wiki/Nagle's_algorithm)
      #     Recommend disabling for RPC style invocations where we don't want to wait for an
      #     ACK from the server before sending the last partial segment
      #     Buffering is recommended in a browser or file transfer style environment
      #     where multiple sends are expected during a single response
      #     Default: true
      #
      #   :connect_retry_count [Fixnum]
      #     Number of times to retry connecting when a connection fails
      #     Default: 10
      #
      #   :connect_retry_interval [Float]
      #     Number of seconds between connection retry attempts after the first failed attempt
      #     Default: 0.5
      #
      #   :retry_count [Fixnum]
      #     Number of times to retry when calling #retry_on_connection_failure
      #     This is independent of :connect_retry_count which still applies with
      #     connection failures. This retry controls upto how many times to retry the
      #     supplied block should a connection failure occurr during the block
      #     Default: 3
      #
      #   :on_connect [Proc]
      #     Directly after a connection is established and before it is made available
      #     for use this Block is invoked.
      #     Typical Use Cases:
      #     - Initialize per connection session sequence numbers
      #     - Pass any authentication information to the server
      #     - Perform a handshake with the server
      #
      #   :policy [Symbol|Proc]
      #     Specify the policy to use when connecting to servers.
      #       :ordered
      #         Select a server in the order supplied in the array, with the first
      #         having the highest priority. The second server will only be connected
      #         to if the first server is unreachable
      #       :random
      #         Randomly select a server from the list every time a connection
      #         is established, including during automatic connection recovery.
      #       :ping_time
      #         FUTURE - Not implemented yet - Pull request anyone?
      #         The server with the lowest ping time will be tried first
      #       Proc:
      #         When a Proc is supplied, it will be called passing in the list
      #         of servers. The Proc must return one server name
      #           Example:
      #             :policy => Proc.new do |servers|
      #               servers.last
      #             end
      #       Default: :ordered
      #
      #   :close_on_error [True|False]
      #     To prevent the connection from going into an inconsistent state
      #     automatically close the connection if an error occurs
      #     This includes a Read Timeout
      #     Default: true
      #
      # Appender Parameters:
      #   separator: [String]
      #     Separator between every message
      #     Default: "\n"
      #     Note: The separator should not be something that could be output in the formatted log message.
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
      # Example:
      #   SemanticLogger.add_appender(
      #     appender: :tcp,
      #     server:   'server:3300'
      #   )
      #
      # Example, with connection retry options:
      #   SemanticLogger.add_appender(
      #     appender:               :tcp,
      #     server:                 'server:3300',
      #     connect_retry_interval: 0.1,
      #     connect_retry_count:    5
      #   )
      def initialize(options = {}, &block)
        @options                           = options.dup
        @separator                         = @options.delete(:separator) || "\n"

        # Use the internal logger so that errors with remote logging are only written locally.
        Net::TCPClient.logger              = SemanticLogger::Logger.logger.dup
        Net::TCPClient.logger.name         = 'Net::TCPClient'

        options = extract_subscriber_options!(@options)
        super(options, &block)
        reopen
      end

      # After forking an active process call #reopen to re-open
      # open the handles to resources
      def reopen
        close
        @tcp_client = Net::TCPClient.new(@options)
      end

      # Write the log using the specified protocol and server.
      def log(log)
        return false unless should_log?(log)

        @tcp_client.retry_on_connection_failure { @tcp_client.write("#{formatter.call(log, self)}#{separator}") }
        true
      end

      # Flush is called by the semantic_logger during shutdown.
      def flush
        @tcp_client.flush if @tcp_client && @tcp_client.respond_to?(:flush)
      end

      # Close is called during shutdown, or with reopen
      def close
        @tcp_client.close if @tcp_client
      end

      private

      # Returns [SemanticLogger::Formatters::Default] formatter default for this Appender
      def default_formatter
        SemanticLogger::Formatters::Json.new
      end

    end
  end
end
