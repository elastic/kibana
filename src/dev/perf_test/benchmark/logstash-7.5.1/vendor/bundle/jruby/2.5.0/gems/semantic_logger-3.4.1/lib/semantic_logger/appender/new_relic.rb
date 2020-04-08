begin
  require 'newrelic_rpm'
rescue LoadError
  raise 'Gem newrelic_rpm is required for logging to New Relic. Please add the gem "newrelic_rpm" to your Gemfile.'
end

# Send log messages to NewRelic
#
# The :error and :fatal log entries will show up under
# "Applications" > "Application Name" > "Events" > "Errors" in New Relic.
#
# Example:
#   SemanticLogger.add_appender(appender: :new_relic)
class SemanticLogger::Appender::NewRelic < SemanticLogger::Subscriber
  # Create Appender
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
    options         = {level: options} unless options.is_a?(Hash)
    options         = options.dup
    options[:level] = :error unless options.has_key?(:level)
    super(options)
  end

  # Returns [Hash] of parameters to send to New Relic.
  def call(log, logger)
    h = log.to_h(host, application)
    h.delete(:time)
    h.delete(:exception)
    {metric: log.metric, custom_params: h}
  end

  # Send an error notification to New Relic
  def log(log)
    return false unless should_log?(log)

    # Send error messages as Runtime exceptions
    exception =
      if log.exception
        log.exception
      else
        error = RuntimeError.new(log.message)
        error.set_backtrace(log.backtrace) if log.backtrace
        error
      end
    # For more documentation on the NewRelic::Agent.notice_error method see:
    # http://rubydoc.info/github/newrelic/rpm/NewRelic/Agent#notice_error-instance_method
    # and https://docs.newrelic.com/docs/ruby/ruby-agent-api
    NewRelic::Agent.notice_error(exception, formatter.call(log, self))
    true
  end

end
