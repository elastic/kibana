require 'syslog'
require 'uri'
require 'socket'

# Send log messages to local syslog, or remote syslog servers over TCP or UDP.
#
# Example: Log to a local Syslog daemon
#   SemanticLogger.add_appender(appender: :syslog)
#
# Example: Log to a remote Syslog server using TCP:
#   SemanticLogger.add_appender(
#     appender: :syslog,
#     url:      'tcp://myloghost:514'
#   )
#
# Example: Log to a remote Syslog server using UDP:
#   SemanticLogger.add_appender(
#     appender: :syslog,
#     url:      'udp://myloghost:514'
#   )
module SemanticLogger
  module Appender
    class Syslog < SemanticLogger::Subscriber

      # Default mapping of ruby log levels to syslog log levels
      #
      # ::Syslog::LOG_EMERG   - "System is unusable"
      # ::Syslog::LOG_ALERT   - "Action needs to be taken immediately"
      # ::Syslog::LOG_CRIT    - "A critical condition has occurred"
      # ::Syslog::LOG_ERR     - "An error occurred"
      # ::Syslog::LOG_WARNING - "Warning of a possible problem"
      # ::Syslog::LOG_NOTICE  - "A normal but significant condition occurred"
      # ::Syslog::LOG_INFO    - "Informational message"
      # ::Syslog::LOG_DEBUG   - "Debugging information"
      DEFAULT_LEVEL_MAP = {
        fatal: ::Syslog::LOG_CRIT,
        error: ::Syslog::LOG_ERR,
        warn:  ::Syslog::LOG_WARNING,
        info:  ::Syslog::LOG_NOTICE,
        debug: ::Syslog::LOG_INFO,
        trace: ::Syslog::LOG_DEBUG
      }
      attr_reader :remote_syslog, :url, :server, :port, :protocol, :facility

      # Create a Syslog appender instance.
      #
      # Parameters
      #   url: [String]
      #     Default: 'syslog://localhost'
      #     For writing logs to a remote syslog server
      #     URL of server: protocol://host:port
      #     Uses port 514 by default for TCP and UDP.
      #     local syslog example:          'syslog://localhost'
      #     TCP example with default port: 'tcp://logger'
      #     TCP example with custom port:  'tcp://logger:8514'
      #     UDP example with default port: 'udp://logger'
      #     UDP example with custom port:  'udp://logger:8514'
      #     When using the :syslog protocol, logs will always be sent to the localhost syslog
      #
      #   host: [String]
      #     Host name to provide to the remote syslog.
      #     Default: SemanticLogger.host
      #
      #   tcp_client: [Hash]
      #     Default: {}
      #     Only used with the TCP protocol.
      #     Specify custom parameters to pass into Net::TCPClient.new
      #     For a list of options see the net_tcp_client documentation:
      #       https://www.omniref.com/ruby/gems/net_tcp_client/1.0.0/symbols/Net::TCPClient/initialize
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
      #   application: [String]
      #     Identity of the program.
      #     Default: SemanticLogger.application
      #
      #   options: [Integer]
      #     Default: ::Syslog::LOG_PID | ::Syslog::LOG_CONS
      #     Any of the following (options can be logically OR'd together)
      #       ::Syslog::LOG_CONS
      #       ::Syslog::LOG_NDELAY
      #       ::Syslog::LOG_NOWAIT
      #       ::Syslog::LOG_ODELAY
      #       ::Syslog::LOG_PERROR
      #       ::Syslog::LOG_PID
      #
      #   facility: [Integer]
      #     Default: ::Syslog::LOG_USER
      #     Type of program (can be logically OR'd together)
      #       ::Syslog::LOG_AUTH
      #       ::Syslog::LOG_AUTHPRIV
      #       ::Syslog::LOG_CONSOLE
      #       ::Syslog::LOG_CRON
      #       ::Syslog::LOG_DAEMON
      #       ::Syslog::LOG_FTP
      #       ::Syslog::LOG_KERN
      #       ::Syslog::LOG_LRP
      #       ::Syslog::LOG_MAIL
      #       ::Syslog::LOG_NEWS
      #       ::Syslog::LOG_NTP
      #       ::Syslog::LOG_SECURITY
      #       ::Syslog::LOG_SYSLOG
      #       ::Syslog::LOG_USER
      #       ::Syslog::LOG_UUCP
      #       ::Syslog::LOG_LOCAL0
      #       ::Syslog::LOG_LOCAL1
      #       ::Syslog::LOG_LOCAL2
      #       ::Syslog::LOG_LOCAL3
      #       ::Syslog::LOG_LOCAL4
      #       ::Syslog::LOG_LOCAL5
      #       ::Syslog::LOG_LOCAL6
      #       ::Syslog::LOG_LOCAL7
      #
      #   level_map: [Hash]
      #     Supply a custom map of SemanticLogger levels to syslog levels.
      #     For example, passing in { warn: ::Syslog::LOG_NOTICE }
      #       would result in a log mapping that matches the default level map,
      #       except for :warn, which ends up with a LOG_NOTICE level instead of a
      #       LOG_WARNING one.
      #     Without overriding any parameters, the level map will be
      #       LEVEL_MAP = {
      #         fatal:   ::Syslog::LOG_CRIT,
      #         error:   ::Syslog::LOG_ERR,
      #         warn:    ::Syslog::LOG_WARNING,
      #         info:    ::Syslog::LOG_NOTICE,
      #         debug:   ::Syslog::LOG_INFO,
      #         trace:   ::Syslog::LOG_DEBUG
      #       }
      #
      #   format: [Symbol]
      #     Format for the Syslog message
      #       :syslog uses the default syslog format
      #       :json uses the CEE JSON Syslog format
      #          Example: "@cee: #{JSON.dump(data)}"
      #     Default: :syslog
      def initialize(options = {}, &block)
        options             = options.dup
        @options            = options.delete(:options) || (::Syslog::LOG_PID | ::Syslog::LOG_CONS)
        @facility           = options.delete(:facility) || ::Syslog::LOG_USER
        level_map           = options.delete(:level_map)
        @url                = options.delete(:url) || options.delete(:server) || 'syslog://localhost'
        uri                 = URI(@url)
        @server             = uri.host || 'localhost'
        @protocol           = (uri.scheme || :syslog).to_sym
        @port               = uri.port || 514
        @server             = 'localhost' if @protocol == :syslog
        @tcp_client_options = options.delete(:tcp_client)

        raise "Unknown protocol #{@protocol}!" unless [:syslog, :tcp, :udp].include?(@protocol)

        @level_map = DEFAULT_LEVEL_MAP.dup
        @level_map.update(level_map) if level_map

        # The syslog_protocol gem is required when logging over TCP or UDP.
        if [:tcp, :udp].include?(@protocol)
          begin
            require 'syslog_protocol'
          rescue LoadError
            raise 'Missing gem: syslog_protocol. This gem is required when logging over TCP or UDP. To fix this error: gem install syslog_protocol'
          end

          # The net_tcp_client gem is required when logging over TCP.
          if protocol == :tcp
            @tcp_client_options          ||= {}
            @tcp_client_options[:server] = "#{@server}:#{@port}"
            begin
              require 'net/tcp_client'
            rescue LoadError
              raise 'Missing gem: net_tcp_client. This gem is required when logging over TCP. To fix this error: gem install net_tcp_client'
            end
          end
        end

        super(options, &block)
        reopen
      end

      # After forking an active process call #reopen to re-open
      # open the handles to resources
      def reopen
        case @protocol
        when :syslog
          ::Syslog.open(application, @options, @facility)
        when :tcp
          # Use the local logger for @remote_syslog so errors with the remote logger can be recorded locally.
          @tcp_client_options[:logger] = SemanticLogger::Logger.logger
          @remote_syslog               = Net::TCPClient.new(@tcp_client_options)
        when :udp
          @remote_syslog = UDPSocket.new
        else
          raise "Unsupported protocol: #{@protocol}"
        end
      end

      # Write the log using the specified protocol and server.
      def log(log)
        return false unless should_log?(log)

        case @protocol
        when :syslog
          # Since the Ruby Syslog API supports sprintf format strings, double up all existing '%'
          message = formatter.call(log, self).gsub '%', '%%'
          ::Syslog.log @level_map[log.level], message
        when :tcp
          @remote_syslog.retry_on_connection_failure { @remote_syslog.write("#{syslog_packet_formatter(log)}\r\n") }
        when :udp
          @remote_syslog.send syslog_packet_formatter(log), 0, @server, @port
        else
          raise "Unsupported protocol: #{protocol}"
        end
        true
      end

      # Flush is called by the semantic_logger during shutdown.
      def flush
        @remote_syslog.flush if @remote_syslog && @remote_syslog.respond_to?(:flush)
      end

      # Custom log formatter for syslog.
      # Only difference is the removal of the timestamp string since it is in the syslog packet.
      def call(log, logger)
        # Header with date, time, log level and process info
        message = "#{log.level_to_s} [#{log.process_info}]"

        # Tags
        message << ' ' << log.tags.collect { |tag| "[#{tag}]" }.join(' ') if log.tags && (log.tags.size > 0)

        # Duration
        message << " (#{log.duration_human})" if log.duration

        # Class / app name
        message << " #{log.name}"

        # Log message
        message << " -- #{log.message}" if log.message

        # Payload
        if payload = log.payload_to_s
          message << ' -- ' << payload
        end

        # Exceptions
        if log.exception
          message << " -- Exception: #{log.exception.class}: #{log.exception.message}\n"
          message << log.backtrace_to_s
        end
        message
      end

      private

      # Extract Syslog formatter options
      def format_options(options, protocol, &block)
        opts      = options.delete(:options)
        facility  = options.delete(:facility)
        level_map = options.delete(:level_map)
        if formatter = options.delete(:formatter)
          extract_formatter(formatter)
        else
          case protocol
          when :syslog
            extract_formatter(syslog: {options: opts, facility: facility, level_map: level_map})
          when :tcp, :udp
            extract_formatter(syslog: {options: opts, facility: facility, level_map: level_map})
          end
        end
      end

      # Format the syslog packet so it can be sent over TCP or UDP
      def syslog_packet_formatter(log)
        packet          = SyslogProtocol::Packet.new
        packet.hostname = host
        packet.facility = @facility
        packet.severity = @level_map[log.level]
        packet.tag      = application.gsub(' ', '')
        packet.content  = formatter.call(log, self)
        packet.time     = log.time
        packet.to_s
      end
    end
  end
end
