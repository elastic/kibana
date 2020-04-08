begin
  require 'bugsnag'
rescue LoadError
  raise 'Gem bugsnag is required for logging purposes. Please add the gem "bugsnag" to your Gemfile.'
end

# Send log messages to Bugsnag
#
# Example:
#   SemanticLogger.add_appender(appender: :bugsnag)
#
class SemanticLogger::Appender::Bugsnag < SemanticLogger::Subscriber
  # Create Bugsnag Error / Exception Appender
  #
  # Parameters
  #   level: [:trace | :debug | :info | :warn | :error | :fatal]
  #     Override the log level for this appender.
  #     Default: :error
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
  def initialize(options = {}, &block)
    # Backward compatibility
    options             = {level: options} unless options.is_a?(Hash)
    options             = options.dup
    options[:level]     = :error unless options.has_key?(:level)

    raise 'Bugsnag only supports :info, :warn, or :error log levels' unless [:info, :warn, :error].include?(options[:level])

    # Replace the Bugsnag logger so that we can identify its log messages and not forward them to Bugsnag
    Bugsnag.configure { |config| config.logger = SemanticLogger[Bugsnag] }

    super(options, &block)
  end

  # Returns [Hash] of parameters to send to Bugsnag.
  def call(log, logger)
    h            = log.to_h(host, application)
    h[:severity] = log_level(log)
    h.delete(:time)
    h.delete(:exception)
    h
  end

  # Send an error notification to Bugsnag
  def log(log)
    return false unless should_log?(log)
    # Ignore logs coming from Bugsnag itself
    return false if log.name == 'Bugsnag'

    # Send error messages as Runtime exceptions
    exception =
      if log.exception
        log.exception
      else
        error = RuntimeError.new(log.message)
        error.set_backtrace(log.backtrace) if log.backtrace
        error
      end

    # For more documentation on the Bugsnag.notify method see:
    # https://bugsnag.com/docs/notifiers/ruby#sending-handled-exceptions
    Bugsnag.notify(exception, formatter.call(log, self))
    true
  end

  private

  # Bugsnag supports: error, warning or info
  def log_level(log)
    case log.level
    when :error, :fatal
      'error'
    when :warn
      'warning'
    else
      'info'
    end
  end
end
