# encoding: utf-8
require "logstash/filters/base"
require "logstash/namespace"

# Execute ruby code.
#
# For example, to cancel 90% of events, you can do this:
# [source,ruby]
#     filter {
#       ruby {
#         # Cancel 90% of events
#         code => "event.cancel if rand <= 0.90"
#       }
#     }
#
# If you need to create additional events, it cannot be done as in other filters where you would use `yield`,
# you must use a specific syntax `new_event_block.call(event)` like in this example duplicating the input event
# [source,ruby]
# filter {
#   ruby {
#     code => "new_event_block.call(event.clone)"
#   }
# }
#
class LogStash::Filters::Ruby < LogStash::Filters::Base
  require "logstash/filters/ruby/script_error"
  require "logstash/filters/ruby/script"

  config_name "ruby"

  # Any code to execute at logstash startup-time
  config :init, :validate => :string

  # The code to execute for every event.
  # You will have an `event` variable available that is the event itself. See the <<event-api,Event API>> for more information.
  config :code, :validate => :string

  # Path to the script
  config :path, :validate => :path

  # Parameters for this specific script
  config :script_params, :type => :hash, :default => {}

  # Tag to add to events that cause an exception in the script filter
  config :tag_on_exception, :type => :string, :default => "_rubyexception"

  def initialize(*params)
    super(*params)
    if @path # run tests on the ruby file script
      @script = Script.new(@path, @script_params)
      @script.load
      @script.test
    end
  end

  def register
    if @code && @path.nil?
      eval(@init, binding, "(ruby filter init)") if @init
      eval("define_singleton_method :filter_method do |event, &new_event_block|\n #{@code} \nend", binding, "(ruby filter code)")
    elsif @path && @code.nil?
      @script.register
    else
      @logger.fatal("You must either use an inline script with the \"code\" option or a script file using \"path\".")
    end
  end

  def self.check_result_events!(results)
    if !results.is_a?(Array)
      raise "Custom script did not return an array from 'filter'. Only arrays may be returned!"
    end

    results.each do |r_event|
      if !r_event.is_a?(::LogStash::Event)
        raise "Custom script returned a non event object '#{r_event.inspect}'!" +
              " You must an array of events from this function! To drop an event simply return nil."
      end
    end
  end

  def filter(event, &block)
    if @code
      inline_script(event, &block)
    elsif @path
      file_script(event, &block)
    end
  end

  def inline_script(event, &block)
    filter_method(event, &block)
    filter_matched(event)
  rescue Exception => e
    @logger.error("Ruby exception occurred: #{e}")
    event.tag(@tag_on_exception)
  end

  def file_script(event)
    begin
      results = @script.execute(event)
      filter_matched(event)

      self.class.check_result_events!(results)
    rescue => e
      event.tag(@tag_on_exception)
      message = "Could not process event: " + e.message
      @logger.error(message, :script_path => @path,
                             :class => e.class.name,
                             :backtrace => e.backtrace)
      return event
    end

    returned_original = false
    results.each do |r_event|
      # If the user has generated a new event we yield that for them here
      if event == r_event
        returned_original = true
      else
        yield r_event
      end

      r_event
    end

    event.cancel unless returned_original
  end
end
