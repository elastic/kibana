require 'concurrent'
require 'socket'

module SemanticLogger
  # Logging levels in order of most detailed to most severe
  LEVELS = [:trace, :debug, :info, :warn, :error, :fatal]

  # Return a logger for the supplied class or class_name
  def self.[](klass)
    SemanticLogger::Logger.new(klass)
  end

  # Sets the global default log level
  def self.default_level=(level)
    @@default_level       = level
    # For performance reasons pre-calculate the level index
    @@default_level_index = level_to_index(level)
  end

  # Returns the global default log level
  def self.default_level
    @@default_level
  end

  # Sets the level at which backtraces should be captured
  # for every log message.
  #
  # By enabling backtrace capture the filename and line number of where
  # message was logged can be written to the log file. Additionally, the backtrace
  # can be forwarded to error management services such as Bugsnag.
  #
  # Warning:
  #   Capturing backtraces is very expensive and should not be done all
  #   the time. It is recommended to run it at :error level in production.
  def self.backtrace_level=(level)
    @@backtrace_level       = level
    # For performance reasons pre-calculate the level index
    @@backtrace_level_index = level.nil? ? 65535 : level_to_index(level)
  end

  # Returns the current backtrace level
  def self.backtrace_level
    @@backtrace_level
  end

  # Returns the current backtrace level index
  # For internal use only
  def self.backtrace_level_index #:nodoc
    @@backtrace_level_index
  end

  # Returns [String] name of this host for logging purposes
  # Note: Not all appenders use `host`
  def self.host
    @@host ||= Socket.gethostname
  end

  # Override the default host name
  def self.host=(host)
    @@host = host
  end

  # Returns [String] name of this application for logging purposes
  # Note: Not all appenders use `application`
  def self.application
    @@application
  end

  # Override the default application
  def self.application=(application)
    @@application = application
  end

  @@application = 'Semantic Logger'

  # Add a new logging appender as a new destination for all log messages
  # emitted from Semantic Logger
  #
  # Appenders will be written to in the order that they are added
  #
  # If a block is supplied then it will be used to customize the format
  # of the messages sent to that appender. See SemanticLogger::Logger.new for
  # more information on custom formatters
  #
  # Parameters
  #   file_name: [String]
  #     File name to write log messages to.
  #
  #   Or,
  #   io: [IO]
  #     An IO Stream to log to.
  #     For example STDOUT, STDERR, etc.
  #
  #   Or,
  #   appender: [Symbol|SemanticLogger::Subscriber]
  #     A symbol identifying the appender to create.
  #     For example:
  #       :bugsnag, :elasticsearch, :graylog, :http, :mongodb, :new_relic, :splunk_http, :syslog, :wrapper
  #          Or,
  #     An instance of an appender derived from SemanticLogger::Subscriber
  #     For example:
  #       SemanticLogger::Appender::Http.new(url: 'http://localhost:8088/path')
  #
  #   Or,
  #   logger: [Logger|Log4r]
  #     An instance of a Logger or a Log4r logger.
  #
  #   level: [:trace | :debug | :info | :warn | :error | :fatal]
  #     Override the log level for this appender.
  #     Default: SemanticLogger.default_level
  #
  #   formatter: [Symbol|Object|Proc]
  #     Any of the following symbol values: :default, :color, :json
  #       Or,
  #     An instance of a class that implements #call
  #       Or,
  #     A Proc to be used to format the output from this appender
  #     Default: :default
  #
  #   filter: [Regexp|Proc]
  #     RegExp: Only include log messages where the class name matches the supplied.
  #     regular expression. All other messages will be ignored.
  #     Proc: Only include log messages where the supplied Proc returns true
  #           The Proc must return true or false.
  #
  # Examples:
  #
  #   # Send all logging output to Standard Out (Screen)
  #   SemanticLogger.add_appender(io: STDOUT)
  #
  #   # Send all logging output to a file
  #   SemanticLogger.add_appender(file_name: 'logfile.log')
  #
  #   # Send all logging output to a file and only :info and above to standard output
  #   SemanticLogger.add_appender(file_name: 'logfile.log')
  #   SemanticLogger.add_appender(io: STDOUT, level: :info)
  #
  # Log to log4r, Logger, etc.:
  #
  #   # Send Semantic logging output to an existing logger
  #   require 'logger'
  #   require 'semantic_logger'
  #
  #   # Built-in Ruby logger
  #   log = Logger.new(STDOUT)
  #   log.level = Logger::DEBUG
  #
  #   SemanticLogger.default_level = :debug
  #   SemanticLogger.add_appender(logger: log)
  #
  #   logger = SemanticLogger['Example']
  #   logger.info "Hello World"
  #   logger.debug("Login time", user: 'Joe', duration: 100, ip_address: '127.0.0.1')
  def self.add_appender(options, deprecated_level = nil, &block)
    options  = options.is_a?(Hash) ? options.dup : convert_old_appender_args(options, deprecated_level)
    appender = appender_from_options(options, &block)
    @@appenders << appender

    # Start appender thread if it is not already running
    SemanticLogger::Logger.start_appender_thread
    appender
  end

  # Remove an existing appender
  # Currently only supports appender instances
  def self.remove_appender(appender)
    @@appenders.delete(appender)
  end

  # Returns [SemanticLogger::Subscriber] a copy of the list of active
  # appenders for debugging etc.
  # Use SemanticLogger.add_appender and SemanticLogger.remove_appender
  # to manipulate the active appenders list
  def self.appenders
    @@appenders.clone
  end

  # Wait until all queued log messages have been written and flush all active
  # appenders
  def self.flush
    SemanticLogger::Logger.flush
  end

  # Close and flush all appenders
  def self.close
    SemanticLogger::Logger.close
  end

  # After forking an active process call SemanticLogger.reopen to re-open
  # any open file handles etc to resources
  #
  # Note: Only appenders that implement the reopen method will be called
  def self.reopen
    @@appenders.each { |appender| appender.reopen if appender.respond_to?(:reopen) }
    # After a fork the appender thread is not running, start it if it is not running
    SemanticLogger::Logger.start_appender_thread
  end

  # Supply a block to be called whenever a metric is seen during measure logging
  #
  #  Parameters
  #    appender: [Symbol | Object | Proc]
  #      [Proc] the block to call.
  #      [Object] the block on which to call #call.
  #      [Symbol] :new_relic, or :statsd to forward metrics to
  #
  #    block
  #      The block to be called
  #
  # Example:
  #   SemanticLogger.on_metric do |log|
  #     puts "#{log.metric} was received. Log Struct: #{log.inspect}"
  #   end
  #
  # Note:
  # * This callback is called in the logging thread.
  # * Does not slow down the application.
  # * Only context is what is passed in the log struct, the original thread context is not available.
  def self.on_metric(options = {}, &block)
    SemanticLogger::Logger.on_metric(options, &block)
  end

  # Add signal handlers for Semantic Logger
  #
  # Two signal handlers will be registered by default:
  #
  # 1. Changing the log_level:
  #
  #   The log level can be changed without restarting the process by sending the
  #   log_level_signal, which by default is 'USR2'
  #
  #   When the log_level_signal is raised on this process, the global default log level
  #   rotates through the following log levels in the following order, starting
  #   from the current global default level:
  #     :warn, :info, :debug, :trace
  #
  #   If the current level is :trace it wraps around back to :warn
  #
  # 2. Logging a Ruby thread dump
  #
  #   When the signal is raised on this process, Semantic Logger will write the list
  #   of threads to the log file, along with their back-traces when available
  #
  #   For JRuby users this thread dump differs form the standard QUIT triggered
  #   Java thread dump which includes system threads and Java stack traces.
  #
  #   It is recommended to name any threads you create in the application, by
  #   calling the following from within the thread itself:
  #      Thread.current.name = 'My Worker'
  #
  # Also adds JRuby Garbage collection logging so that any garbage collections
  # that exceed the time threshold will be logged. Default: 100 ms
  # Currently only supported when running JRuby
  #
  # Note:
  #   To only register one of the signal handlers, set the other to nil
  #   Set gc_log_microseconds to nil to not enable JRuby Garbage collections
  def self.add_signal_handler(log_level_signal='USR2', thread_dump_signal='TTIN', gc_log_microseconds=100000)
    Signal.trap(log_level_signal) do
      index     = (default_level == :trace) ? LEVELS.find_index(:error) : LEVELS.find_index(default_level)
      new_level = LEVELS[index-1]
      self['SemanticLogger'].warn "Changed global default log level to #{new_level.inspect}"
      self.default_level = new_level
    end if log_level_signal

    Signal.trap(thread_dump_signal) do
      logger = SemanticLogger['Thread Dump']
      Thread.list.each do |thread|
        next if thread == Thread.current
        message = thread.name
        if backtrace = thread.backtrace
          message += "\n"
          message << backtrace.join("\n")
        end
        tags = thread[:semantic_logger_tags]
        tags = tags.nil? ? [] : tags.clone
        logger.tagged(tags) { logger.warn(message) }
      end
    end if thread_dump_signal

    if gc_log_microseconds && defined?(JRuby)
      listener = SemanticLogger::JRuby::GarbageCollectionLogger.new(gc_log_microseconds)
      Java::JavaLangManagement::ManagementFactory.getGarbageCollectorMXBeans.each do |gcbean|
        gcbean.add_notification_listener(listener, nil, nil)
      end
    end

    true
  end

  # If the tag being supplied is definitely a string then this fast
  # tag api can be used for short lived tags
  def self.fast_tag(tag)
    (Thread.current[:semantic_logger_tags] ||= []) << tag
    yield
  ensure
    Thread.current[:semantic_logger_tags].pop
  end

  # Add the supplied named tags to the list of tags to log for this thread whilst
  # the supplied block is active.
  #
  # Returns result of block
  #
  # Example:
  def self.named_tags(tag)
    (Thread.current[:semantic_logger_tags] ||= []) << tag
    yield
  ensure
    Thread.current[:semantic_logger_tags].pop
  end

  # Add the supplied tags to the list of tags to log for this thread whilst
  # the supplied block is active.
  # Returns result of block
  def self.tagged(*tags)
    new_tags = push_tags(*tags)
    yield self
  ensure
    pop_tags(new_tags.size)
  end

  # Returns a copy of the [Array] of [String] tags currently active for this thread
  # Returns nil if no tags are set
  def self.tags
    # Since tags are stored on a per thread basis this list is thread-safe
    t = Thread.current[:semantic_logger_tags]
    t.nil? ? [] : t.clone
  end

  # Add tags to the current scope
  # Returns the list of tags pushed after flattening them out and removing blanks
  def self.push_tags(*tags)
    # Need to flatten and reject empties to support calls from Rails 4
    new_tags                              = tags.flatten.collect(&:to_s).reject(&:empty?)
    t                                     = Thread.current[:semantic_logger_tags]
    Thread.current[:semantic_logger_tags] = t.nil? ? new_tags : t.concat(new_tags)
    new_tags
  end

  # Remove specified number of tags from the current tag list
  def self.pop_tags(quantity=1)
    t = Thread.current[:semantic_logger_tags]
    t.pop(quantity) unless t.nil?
  end

  # Silence noisy log levels by changing the default_level within the block
  #
  # This setting is thread-safe and only applies to the current thread
  #
  # Any threads spawned within the block will not be affected by this setting
  #
  # #silence can be used to both raise and lower the log level within
  # the supplied block.
  #
  # Example:
  #
  #   # Perform trace level logging within the block when the default is higher
  #   SemanticLogger.default_level = :info
  #
  #   logger.debug 'this will _not_ be logged'
  #
  #   SemanticLogger.silence(:trace) do
  #     logger.debug "this will be logged"
  #   end
  #
  # Parameters
  #   new_level
  #     The new log level to apply within the block
  #     Default: :error
  #
  # Example:
  #   # Silence all logging for this thread below :error level
  #   SemanticLogger.silence do
  #     logger.info "this will _not_ be logged"
  #     logger.warn "this neither"
  #     logger.error "but errors will be logged"
  #   end
  #
  # Note:
  #   #silence does not affect any loggers which have had their log level set
  #   explicitly. I.e. That do not rely on the global default level
  def self.silence(new_level = :error)
    current_index                            = Thread.current[:semantic_logger_silence]
    Thread.current[:semantic_logger_silence] = SemanticLogger.level_to_index(new_level)
    yield
  ensure
    Thread.current[:semantic_logger_silence] = current_index
  end

  private

  @@appenders = Concurrent::Array.new

  def self.default_level_index
    Thread.current[:semantic_logger_silence] || @@default_level_index
  end

  # Returns the symbolic level for the supplied level index
  def self.index_to_level(level_index)
    LEVELS[level_index]
  end

  # Internal method to return the log level as an internal index
  # Also supports mapping the ::Logger levels to SemanticLogger levels
  def self.level_to_index(level)
    return if level.nil?

    index =
      if level.is_a?(Symbol)
        LEVELS.index(level)
      elsif level.is_a?(String)
        level = level.downcase.to_sym
        LEVELS.index(level)
      elsif level.is_a?(Integer) && defined?(::Logger::Severity)
        # Mapping of Rails and Ruby Logger levels to SemanticLogger levels
        @@map_levels ||= begin
          levels = []
          ::Logger::Severity.constants.each do |constant|
            levels[::Logger::Severity.const_get(constant)] = LEVELS.find_index(constant.downcase.to_sym) || LEVELS.find_index(:error)
          end
          levels
        end
        @@map_levels[level]
      end
    raise "Invalid level:#{level.inspect} being requested. Must be one of #{LEVELS.inspect}" unless index
    index
  end

  # Backward compatibility
  def self.convert_old_appender_args(appender, level)
    options         = {}
    options[:level] = level if level

    if appender.is_a?(String)
      options[:file_name] = appender
    elsif appender.is_a?(IO)
      options[:io] = appender
    elsif appender.is_a?(Symbol) || appender.is_a?(Subscriber)
      options[:appender] = appender
    else
      options[:logger] = appender
    end
    warn "[DEPRECATED] SemanticLogger.add_appender parameters have changed. Please use: #{options.inspect}" if $VERBOSE
    options
  end

  # Returns [SemanticLogger::Subscriber] appender for the supplied options
  def self.appender_from_options(options, &block)
    if options[:io] || options[:file_name]
      SemanticLogger::Appender::File.new(options, &block)
    elsif appender = options.delete(:appender)
      if appender.is_a?(Symbol)
        constantize_symbol(appender).new(options)
      elsif appender.is_a?(Subscriber)
        appender
      else
        raise(ArgumentError, "Parameter :appender must be either a Symbol or an object derived from SemanticLogger::Subscriber, not: #{appender.inspect}")
      end
    elsif options[:logger]
      SemanticLogger::Appender::Wrapper.new(options, &block)
    end
  end

  def self.constantize_symbol(symbol, namespace = 'SemanticLogger::Appender')
    klass = "#{namespace}::#{camelize(symbol.to_s)}"
    begin
      if RUBY_VERSION.to_i >= 2
        Object.const_get(klass)
      else
        klass.split('::').inject(Object) { |o, name| o.const_get(name) }
      end
    rescue NameError
      raise(ArgumentError, "Could not convert symbol: #{symbol} to a class in: #{namespace}. Looking for: #{klass}")
    end
  end

  # Borrow from Rails, when not running Rails
  def self.camelize(term)
    string = term.to_s
    string = string.sub(/^[a-z\d]*/) { |match| match.capitalize }
    string.gsub!(/(?:_|(\/))([a-z\d]*)/i) { "#{$1}#{$2.capitalize}" }
    string.gsub!('/'.freeze, '::'.freeze)
    string
  end

  # Initial default Level for all new instances of SemanticLogger::Logger
  @@default_level         = :info
  @@default_level_index   = level_to_index(@@default_level)
  @@backtrace_level       = :error
  @@backtrace_level_index = level_to_index(@@backtrace_level)
end
