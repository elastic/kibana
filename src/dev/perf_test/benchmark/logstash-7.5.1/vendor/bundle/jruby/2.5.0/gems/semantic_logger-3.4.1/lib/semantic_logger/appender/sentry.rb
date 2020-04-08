begin
  require 'sentry-raven'
rescue LoadError
  raise 'Gem sentry-raven is required for logging purposes. Please add the gem "sentry-raven" to your Gemfile.'
end

# Send log messages to sentry
#
# Example:
#   SemanticLogger.add_appender(appender: :sentry)
#
class SemanticLogger::Appender::Sentry < SemanticLogger::Subscriber
  # Create Appender
  #
  # Parameters
  #   level: [:trace | :debug | :info | :warn | :error | :fatal]
  #     Override the log level for this appender.
  #     Default: :error
  #
  #   formatter: [Object|Proc|Symbol|Hash]
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
  #   host: [String]
  #     Name of this host to appear in log messages.
  #     Default: SemanticLogger.host
  #
  #   application: [String]
  #     Name of this application to appear in log messages.
  #     Default: SemanticLogger.application
  def initialize(options = {}, &block)
    options         = options.is_a?(Hash) ? options.dup : {level: options}
    options[:level] ||= :error

    super(options, &block)
  end

  # Send an error notification to sentry
  def log(log)
    return false unless should_log?(log)

    context = formatter.call(log, self)
    if log.exception
      context.delete(:exception)
      Raven.capture_exception(log.exception, context)
    else
      message = {
        error_class:   context.delete(:name),
        error_message: context.delete(:message),
        extra: context
      }
      message[:backtrace] = log.backtrace if log.backtrace
      Raven.capture_message(message[:error_message], message)
    end
    true
  end

  private

  # Use Raw Formatter by default
  def default_formatter
    SemanticLogger::Formatters::Raw.new
  end

end
