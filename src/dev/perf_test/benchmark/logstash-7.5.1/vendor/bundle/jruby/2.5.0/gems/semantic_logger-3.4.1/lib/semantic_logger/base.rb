# Base logger
#
#   Abstract base class for loggers
#
#   Implements common behavior such as log level, default text formatter etc
#
#   Note: Do not create instances of this class directly
#
module SemanticLogger
  class Base
    # Class name to be logged
    attr_accessor :name, :filter

    # Set the logging level for this logger
    #
    # Note: This level is only for this particular instance. It does not override
    #   the log level in any logging instance or the default log level
    #   SemanticLogger.default_level
    #
    # Must be one of the values in SemanticLogger::LEVELS, or
    # nil if this logger instance should use the global default level
    def level=(level)
      @level_index = SemanticLogger.level_to_index(level)
      @level       = SemanticLogger.send(:index_to_level, @level_index)
    end

    # Returns the current log level if set, otherwise it returns the global
    # default log level
    def level
      @level || SemanticLogger.default_level
    end

    # Implement the log level calls
    #   logger.debug(message, hash|exception=nil, &block)
    #
    # Implement the log level query
    #   logger.debug?
    #
    # Parameters:
    #   message
    #     [String] text message to be logged
    #     Should always be supplied unless the result of the supplied block returns
    #     a string in which case it will become the logged message
    #     Default: nil
    #
    #   payload
    #     [Hash|Exception] Optional hash payload or an exception to be logged
    #     Default: nil
    #
    #   exception
    #     [Exception] Optional exception to be logged
    #     Allows both an exception and a payload to be logged
    #     Default: nil
    #
    # Examples:
    #    require 'semantic_logger'
    #
    #    # Enable trace level logging
    #    SemanticLogger.default_level = :info
    #
    #    # Log to screen
    #    SemanticLogger.add_appender(io: STDOUT, formatter: :color)
    #
    #    # And log to a file at the same time
    #    SemanticLogger.add_appender(file_name: 'application.log', formatter: :color)
    #
    #    logger = SemanticLogger['MyApplication']
    #    logger.debug("Only display this if log level is set to Debug or lower")
    #
    #    # Log semantic information along with a text message
    #    logger.info("Request received", user: "joe", duration: 100)
    #
    #    # Log an exception in a semantic way
    #    logger.info("Parsing received XML", exc)
    #
    SemanticLogger::LEVELS.each_with_index do |level, index|
      class_eval <<-EOT, __FILE__, __LINE__ + 1
        def #{level}(message=nil, payload=nil, exception=nil, &block)
          if level_index <= #{index}
            log_internal(:#{level}, #{index}, message, payload, exception, &block)
            true
          else
            false
          end
        end

        def #{level}?
          level_index <= #{index}
        end

        def measure_#{level}(message, params = {}, &block)
          if level_index <= #{index}
            measure_internal(:#{level}, #{index}, message, params, &block)
          else
            block.call(params) if block
          end
        end

        def benchmark_#{level}(message, params = {}, &block)
          if level_index <= #{index}
            measure_internal(:#{level}, #{index}, message, params, &block)
          else
            block.call(params) if block
          end
        end
      EOT
    end

    # Dynamically supply the log level with every measurement call
    def measure(level, message, params = {}, &block)
      index = SemanticLogger.level_to_index(level)
      if level_index <= index
        measure_internal(level, index, message, params, &block)
      else
        block.call(params) if block
      end
    end

    alias_method :benchmark, :measure

    # :nodoc:
    def tagged(*tags, &block)
      SemanticLogger.tagged(*tags, &block)
    end

    # :nodoc:
    alias_method :with_tags, :tagged

    # :nodoc:
    def tags
      SemanticLogger.tags
    end

    # :nodoc:
    def push_tags(*tags)
      SemanticLogger.push_tags(*tags)
    end

    # :nodoc:
    def pop_tags(quantity = 1)
      SemanticLogger.pop_tags(quantity)
    end

    # :nodoc:
    def silence(new_level = :error, &block)
      SemanticLogger.silence(new_level, &block)
    end

    # :nodoc:
    def fast_tag(tag, &block)
      SemanticLogger.fast_tag(tag, &block)
    end

    # Thread specific context information to be logged with every log entry
    #
    # Add a payload to all log calls on This Thread within the supplied block
    #
    #   logger.with_payload(tracking_number: 12345) do
    #     logger.debug('Hello World')
    #   end
    #
    # If a log call already includes a pyload, this payload will be merged with
    # the supplied payload, with the supplied payload taking precedence
    #
    #   logger.with_payload(tracking_number: 12345) do
    #     logger.debug('Hello World', result: 'blah')
    #   end
    def with_payload(payload)
      current_payload                          = self.payload
      Thread.current[:semantic_logger_payload] = current_payload ? current_payload.merge(payload) : payload
      yield
    ensure
      Thread.current[:semantic_logger_payload] = current_payload
    end

    # Returns [Hash] payload to be added to every log entry in the current scope
    # on this thread.
    # Returns nil if no payload is currently set
    def payload
      Thread.current[:semantic_logger_payload]
    end

    protected

    # Write log data to underlying data storage
    def log(log_)
      raise NotImplementedError.new('Logging Appender must implement #log(log)')
    end

    private

    # Initializer for Abstract Class SemanticLogger::Base
    #
    # Parameters
    #  klass [String]
    #   Name of the class, module, or other identifier for which the log messages
    #   are being logged
    #
    #  level [Symbol]
    #    Only allow log entries of this level or higher to be written to this appender
    #    For example if set to :warn, this appender would only log :warn and :fatal
    #    log messages when other appenders could be logging :info and lower
    #
    #  filter [Regexp|Proc]
    #    RegExp: Only include log messages where the class name matches the supplied
    #    regular expression. All other messages will be ignored
    #    Proc: Only include log messages where the supplied Proc returns true
    #          The Proc must return true or false
    def initialize(klass, level=nil, filter=nil)
      # Support filtering all messages to this logger using a Regular Expression
      # or Proc
      raise ':filter must be a Regexp or Proc' unless filter.nil? || filter.is_a?(Regexp) || filter.is_a?(Proc)

      @filter = filter.is_a?(Regexp) ? filter.freeze : filter
      @name   = klass.is_a?(String) ? klass : klass.name
      if level.nil?
        # Allow the global default level to determine this loggers log level
        @level_index = nil
        @level       = nil
      else
        self.level = level
      end
    end

    # Return the level index for fast comparisons
    # Returns the global default level index if the level has not been explicitly
    # set for this instance
    def level_index
      @level_index || SemanticLogger.default_level_index
    end

    # Whether to log the supplied message based on the current filter if any
    def include_message?(log)
      return true if @filter.nil?

      if @filter.is_a?(Regexp)
        (@filter =~ log.name) != nil
      elsif @filter.is_a?(Proc)
        @filter.call(log) == true
      end
    end

    # Whether the log message should be logged for the current logger or appender
    def should_log?(log)
      # Ensure minimum log level is met, and check filter
      (level_index <= (log.level_index || 0)) && include_message?(log)
    end

    # Log message at the specified level
    def log_internal(level, index, message=nil, payload=nil, exception=nil)
      # Exception being logged?
      # Under JRuby a java exception is not a Ruby Exception
      #   Java::JavaLang::ClassCastException.new.is_a?(Exception) => false
      if exception.nil? && payload.nil? && message.respond_to?(:backtrace) && message.respond_to?(:message)
        exception = message
        message   = nil
      elsif exception.nil? && payload && payload.respond_to?(:backtrace) && payload.respond_to?(:message)
        exception = payload
        payload   = nil
      end

      # Add result of block as message or payload if not nil
      if block_given? && (result = yield)
        if result.is_a?(String)
          message = message.nil? ? result : "#{message} -- #{result}"
        elsif message.nil? && result.is_a?(Hash)
          message = result
        elsif payload && payload.respond_to?(:merge)
          payload.merge(result)
        else
          payload = result
        end
      end

      # Add scoped payload
      if self.payload
        payload = payload.nil? ? self.payload : self.payload.merge(payload)
      end

      # Add caller stack trace
      backtrace = extract_backtrace if index >= SemanticLogger.backtrace_level_index

      log = Log.new(level, Thread.current.name, name, message, payload, Time.now, nil, tags, index, exception, nil, backtrace)

      # Logging Hash only?
      # logger.info(name: 'value')
      if payload.nil? && exception.nil? && message.is_a?(Hash)
        payload           = message.dup
        min_duration      = payload.delete(:min_duration) || 0.0
        log.exception     = payload.delete(:exception)
        log.message       = payload.delete(:message)
        log.metric        = payload.delete(:metric)
        log.metric_amount = payload.delete(:metric_amount) || 1
        if duration = payload.delete(:duration)
          return false if duration <= min_duration
          log.duration = duration
        end
        log.payload = payload if payload.size > 0
      end

      self.log(log) if include_message?(log)
    end

    SELF_PATTERN = File.join('lib', 'semantic_logger')

    # Extract the callers backtrace leaving out Semantic Logger
    def extract_backtrace
      stack = caller
      while (first = stack.first) && first.include?(SELF_PATTERN)
        stack.shift
      end
      stack
    end

    # Measure the supplied block and log the message
    def measure_internal(level, index, message, params)
      start     = Time.now
      exception = nil
      begin
        if block_given?
          result    =
            if silence_level = params[:silence]
              # In case someone accidentally sets `silence: true` instead of `silence: :error`
              silence_level = :error if silence_level == true
              silence(silence_level) { yield(params) }
            else
              yield(params)
            end
          exception = params[:exception]
          result
        end
      rescue Exception => exc
        exception = exc
      ensure
        end_time           = Time.now
        # Extract options after block completes so that block can modify any of the options
        log_exception      = params[:log_exception] || :partial
        on_exception_level = params[:on_exception_level]
        min_duration       = params[:min_duration] || 0.0
        payload            = params[:payload]
        metric             = params[:metric]
        duration           =
          if block_given?
            1000.0 * (end_time - start)
          else
            params[:duration] || raise('Mandatory block missing when :duration option is not supplied')
          end

        # Add scoped payload
        if self.payload
          payload = payload.nil? ? self.payload : self.payload.merge(payload)
        end
        if exception
          logged_exception = exception
          backtrace        = nil
          case log_exception
          when :full
            # On exception change the log level
            if on_exception_level
              level = on_exception_level
              index = SemanticLogger.level_to_index(level)
            end
          when :partial
            # On exception change the log level
            if on_exception_level
              level = on_exception_level
              index = SemanticLogger.level_to_index(level)
            end
            message          = "#{message} -- Exception: #{exception.class}: #{exception.message}"
            logged_exception = nil
            backtrace        = exception.backtrace
          else
            # Log the message with its duration but leave out the exception that was raised
            logged_exception = nil
            backtrace        = exception.backtrace
          end
          log = Log.new(level, Thread.current.name, name, message, payload, end_time, duration, tags, index, logged_exception, metric, backtrace)
          self.log(log) if include_message?(log)
          raise exception
        elsif duration >= min_duration
          # Only log if the block took longer than 'min_duration' to complete
          # Add caller stack trace
          backtrace = extract_backtrace if index >= SemanticLogger.backtrace_level_index

          log = Log.new(level, Thread.current.name, name, message, payload, end_time, duration, tags, index, nil, metric, backtrace)
          self.log(log) if include_message?(log)
        end
      end
    end

  end
end
