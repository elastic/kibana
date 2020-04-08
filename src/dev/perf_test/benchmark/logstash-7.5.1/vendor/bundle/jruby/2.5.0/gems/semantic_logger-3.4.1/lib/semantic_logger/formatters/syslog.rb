begin
  require 'syslog_protocol'
rescue LoadError
  raise 'Gem syslog_protocol is required for remote logging using the Syslog protol. Please add the gem "syslog_protocol" to your Gemfile.'
end

module SemanticLogger
  module Formatters
    class Syslog < Default
      attr_accessor :level_map, :options, :facility

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
      }.freeze

      # Create a Syslog Log Formatter
      #
      # Parameters:
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
      def initialize(options = {})
        options    = options.dup
        @options   = options.delete(:options) || (::Syslog::LOG_PID | ::Syslog::LOG_CONS)
        @facility  = options.delete(:facility) || ::Syslog::LOG_USER
        @level_map = DEFAULT_LEVEL_MAP.dup
        if level_map  = options.delete(:level_map)
          @level_map.update(level_map)
        end
        # Time is already part of Syslog packet
        options[:time_format] = nil unless options.has_key?(:time_format)
        super(options)
      end

      def call(log, logger)
        message = super(log, logger)
        create_syslog_packet(log, message)
      end

      # Create Syslog Packet
      def create_syslog_packet(log, message)
        packet          = SyslogProtocol::Packet.new
        packet.hostname = host
        packet.facility = facility
        packet.tag      = application.gsub(' ', '')
        packet.content  = message
        packet.time     = log.time
        packet.severity = level_map[log.level]
        packet.to_s
      end

    end
  end
end

