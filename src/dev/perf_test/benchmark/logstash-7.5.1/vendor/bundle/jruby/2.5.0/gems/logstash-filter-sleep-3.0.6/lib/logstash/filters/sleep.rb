# encoding: utf-8
require "logstash/filters/base"
require "logstash/namespace"

# Sleep a given amount of time. This will cause logstash
# to stall for the given amount of time. This is useful
# for rate limiting, etc.
#
class LogStash::Filters::Sleep < LogStash::Filters::Base
  config_name "sleep"

  # The length of time to sleep, in seconds, for every event.
  #
  # This can be a number (eg, 0.5), or a string (eg, `%{foo}`)
  # The second form (string with a field value) is useful if
  # you have an attribute of your event that you want to use
  # to indicate the amount of time to sleep.
  #
  # Example:
  # [source,ruby]
  #     filter {
  #       sleep {
  #         # Sleep 1 second for every event.
  #         time => "1"
  #       }
  #     }
  config :time, :validate => :string

  # Sleep on every N'th. This option is ignored in replay mode.
  #
  # Example:
  # [source,ruby]
  #     filter {
  #       sleep {
  #         time => "1"   # Sleep 1 second
  #         every => 10   # on every 10th event
  #       }
  #     }
  config :every, :validate => :string, :default => 1

  # Enable replay mode.
  #
  # Replay mode tries to sleep based on timestamps in each event.
  #
  # The amount of time to sleep is computed by subtracting the
  # previous event's timestamp from the current event's timestamp.
  # This helps you replay events in the same timeline as original.
  #
  # If you specify a `time` setting as well, this filter will
  # use the `time` value as a speed modifier. For example,
  # a `time` value of 2 will replay at double speed, while a
  # value of 0.25 will replay at 1/4th speed.
  #
  # For example:
  # [source,ruby]
  #     filter {
  #       sleep {
  #         time => 2
  #         replay => true
  #       }
  #     }
  #
  # The above will sleep in such a way that it will perform
  # replay 2-times faster than the original time speed.
  config :replay, :validate => :boolean, :default => false

  public
  def register
    if @replay && @time.nil?
      # Default time multiplier is 1 when replay is set.
      @time = 1
    end
    if @time.nil?
      raise ArgumentError, "Missing required parameter 'time' for input/eventlog"
    end
    @count = 0
  end # def register

  public
  def filter(event)
    
    @count += 1

    case @time
      when Fixnum, Float; time = @time
      when nil; # nothing
      else; time = event.sprintf(@time).to_f
    end

    if @replay
      clock = event.timestamp.to_f
      if @last_clock
        delay = clock - @last_clock
        time = delay/time
        if time > 0
          @logger.debug? && @logger.debug("Sleeping", :delay => time)
          sleep(time)
        end
      end
      @last_clock = clock
    else
      if @count >= @every.to_f
        @count = 0
        @logger.debug? && @logger.debug("Sleeping", :delay => time)
        sleep(time)
      end
    end
    filter_matched(event)
  end # def filter
end # class LogStash::Filters::Sleep
