module SemanticLogger
  module Formatters
    class Base
      attr_accessor :time_format, :precision, :log_host, :log_application

      # Parameters
      #   time_format: [String|Symbol|nil]
      #     See Time#strftime for the format of this string
      #     :iso_8601 Outputs an ISO8601 Formatted timestamp
      #     nil:      Returns Empty string for time ( no time is output ).
      #     Default: '%Y-%m-%d %H:%M:%S.%6N'
      def initialize(options = {})
        options          = options.dup
        @precision       = defined?(JRuby) ? 3 : 6
        default_format   = "%Y-%m-%d %H:%M:%S.%#{precision}N"
        @time_format     = options.has_key?(:time_format) ? options.delete(:time_format) : default_format
        @log_host        = options.has_key?(:log_host) ? options.delete(:log_host) : true
        @log_application = options.has_key?(:log_application) ? options.delete(:log_application) : true
        raise(ArgumentError, "Unknown options: #{options.inspect}") if options.size > 0
      end

      # Return the Time as a formatted string
      def format_time(time)
        case time_format
        when :iso_8601
          time.utc.iso8601(precision)
        when nil
          ''
        else
          time.strftime(time_format)
        end
      end

    end
  end
end
