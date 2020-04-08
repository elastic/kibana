require "cabin/namespace"

# This module implements methods that act somewhat like Ruby's Logger class
# It is included in Cabin::Channel
module Cabin::Mixins::Logger

  def self.included(klass)
    klass.condition do |event, subscription|
      if subscription.nil?
        true
      else
        LEVELS[(subscription.options[:level] || :debug)] >= LEVELS[event[:level]].to_i
      end
    end
  end

  attr_accessor :level
  LEVELS = {
    :fatal => 0,
    :error => 1,
    :warn => 2,
    :info => 3,
    :debug => 4
  }

  BACKTRACE_RE = /([^:]+):([0-9]+)(?::in `(.*)')?/

  def level=(value)
    if value.respond_to?(:downcase)
      @level = value.downcase.to_sym
    else
      @level = value.to_sym
    end
  end # def level

  # Define the usual log methods: info, fatal, etc.
  # Each level-based method accepts both a message and a hash data.
  #
  # This will define methods such as 'fatal' and 'fatal?' for each
  # of: fatal, error, warn, info, debug
  #
  # The first method type (ie Cabin::Channel#fatal) is what logs, and it takes a
  # message and an optional Hash with context.
  #
  # The second method type (ie; Cabin::Channel#fatal?) returns true if
  # fatal logs are being emitted, false otherwise.
  %w(fatal error warn info debug).each do |level|
    level = level.to_sym
    predicate = "#{level}?".to_sym

    # def info, def warn, etc...

    # Arguments: message, data, data is assumed to be {} if nil
    # This hack is necessary because ruby 1.8 doesn't support default arguments
    # on blocks.
    define_method(level) do |*args| #|message, data={}|
      if args.size < 1
        raise ::ArgumentError.new("#{self.class.name}##{level}(message, " \
                                  "data={}) requires at least 1 argument")
      end
      if args.size > 2
        raise ::ArgumentError.new("#{self.class.name}##{level}(message, " \
                                  "data={}) takes at most 2 arguments")
      end

      message = args[0]
      data = args[1] || {}

      if not data.is_a?(Hash)
        raise ::ArgumentError.new("#{self.class.name}##{level}(message, " \
                                  "data={}) - second argument you gave me was" \
                                  "a #{data.class.name}, I require a Hash.")
      end

      log_with_level(level, message, data) if send(predicate)
    end

    # def info?, def warn? ...
    # these methods return true if the loglevel allows that level of log.
    define_method(predicate) do 
      @level ||= :info
      LEVELS[@level] >= LEVELS[level]
    end # def info?, def warn? ...
  end # end defining level-based log methods

  private
  def log_with_level(level, message, data={})
    # Invoke 'info?' etc to ask if we should act.
    data[:level] = level
    _log(message, data)
  end # def log_with_level

  def log(message, data={})
    _log(message, data)
  end

  def _log(message, data={})
    case message
      when Hash
        data.merge!(message)
      when Exception
        # message is an exception
        data[:message] = message.to_s
        data[:exception] = message.class
        data[:backtrace] = message.backtrace
      else
        data = { :message => message }.merge(data)
    end

    # Add extra debugging bits (file, line, method) if level is debug.
    debugharder(caller[2], data) if @level == :debug

    publish(data)
  end # def log

  # This method is used to pull useful information about the caller
  # of the logging method such as the caller's file, method, and line number.
  def debugharder(callinfo, data)
    m = BACKTRACE_RE.match(callinfo)
    return unless m
    path, line, method = m[1..3]
    whence = $:.detect { |p| path.start_with?(p) }
    if whence
      # Remove the RUBYLIB path portion of the full file name 
      file = path[whence.length + 1..-1]
    else
      # We get here if the path is not in $:
      file = path
    end
    
    data[:file] = file
    data[:line] = line
    data[:method] = method
  end # def debugharder

  public(:log)
end # module Cabin::Mixins::Logger
