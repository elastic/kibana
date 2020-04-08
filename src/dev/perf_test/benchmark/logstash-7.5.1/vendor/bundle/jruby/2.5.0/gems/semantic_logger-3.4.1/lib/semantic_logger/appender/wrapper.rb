# Send log messages to any standard Ruby logging class.
#
#  Forwards logging call to loggers such as Logger, log4r, etc.
#
module SemanticLogger
  module Appender
    class Wrapper < SemanticLogger::Subscriber
      attr_reader :logger

      # Forward all logging calls to the supplied logging instance.
      #
      # Parameters
      #   logger: [Object]
      #     Instance of an existing logger conforming to the Ruby Logger methods.
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
      # Ruby Logger
      #    require 'logger'
      #    require 'semantic_logger'
      #
      #    ruby_logger = Logger.new(STDOUT)
      #    SemanticLogger.add_appender(logger: ruby_logger)
      #
      #    logger =  SemanticLogger['test']
      #    logger.info('Hello World', some: :payload)
      #
      # Install the `rails_semantic_logger` gem to replace the Rails logger with Semantic Logger.
      def initialize(options, &block)
        # Backward compatibility
        options = {logger: options} unless options.is_a?(Hash)
        options = options.dup
        @logger = options.delete(:logger)

        # Check if the custom appender responds to all the log levels. For example Ruby ::Logger
        if does_not_implement = LEVELS[1..-1].find { |i| !@logger.respond_to?(i) }
          raise(ArgumentError, "Supplied logger does not implement:#{does_not_implement}. It must implement all of #{LEVELS[1..-1].inspect}")
        end

        raise 'SemanticLogging::Appender::Wrapper missing mandatory parameter :logger' unless @logger
        super(options, &block)
      end

      # Pass log calls to the underlying Rails, log4j or Ruby logger
      #  trace entries are mapped to debug since :trace is not supported by the
      #  Ruby or Rails Loggers
      def log(log)
        return false unless should_log?(log)

        @logger.send(log.level == :trace ? :debug : log.level, formatter.call(log, self))
        true
      end

      # Flush all pending logs to disk.
      #  Waits for all sent documents to be writted to disk
      def flush
        @logger.flush if @logger.respond_to?(:flush)
      end

    end
  end
end
