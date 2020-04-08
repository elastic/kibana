require "logstash/filters/base"
require "logstash/namespace"
require "thread_safe"
require "atomic"

# The throttle filter is for throttling the number of events.  The filter is
# configured with a lower bound, the "before_count", and upper bound, the "after_count",
# and a period of time.  All events passing through the filter will be counted based on
# their key and the event timestamp.  As long as the count is less than the "before_count"
# or greater than the "after_count", the event will be "throttled" which means the filter
# will be considered successful and any tags or fields will be added (or removed).
#
# The plugin is thread-safe and properly tracks past events.
#
# For example, if you wanted to throttle events so you only receive an event after 2
# occurrences and you get no more than 3 in 10 minutes, you would use the configuration:
# [source,ruby]
#     period => 600
#     max_age => 1200
#     before_count => 3
#     after_count => 5
#
# Which would result in:
# ==========================
#     event 1 - throttled (successful filter, period start)
#     event 2 - throttled (successful filter)
#     event 3 - not throttled
#     event 4 - not throttled
#     event 5 - not throttled
#     event 6 - throttled (successful filter)
#     event 7 - throttled (successful filter)
#     event x - throttled (successful filter)
#     period end
#     event 1 - throttled (successful filter, period start)
#     event 2 - throttled (successful filter)
#     event 3 - not throttled
#     event 4 - not throttled
#     event 5 - not throttled
#     event 6 - throttled (successful filter)
#     ...
# ==========================
# Another example is if you wanted to throttle events so you only
# receive 1 event per hour, you would use the configuration:
# [source,ruby]
#     period => 3600
#     max_age => 7200
#     before_count => -1
#     after_count => 1
#
# Which would result in:
# ==========================
#     event 1 - not throttled (period start)
#     event 2 - throttled (successful filter)
#     event 3 - throttled (successful filter)
#     event 4 - throttled (successful filter)
#     event x - throttled (successful filter)
#     period end
#     event 1 - not throttled (period start)
#     event 2 - throttled (successful filter)
#     event 3 - throttled (successful filter)
#     event 4 - throttled (successful filter)
#     ...
# ==========================
# A common use case would be to use the throttle filter to throttle events before 3 and
# after 5 while using multiple fields for the key and then use the drop filter to remove
# throttled events. This configuration might appear as:
# [source,ruby]
#     filter {
#       throttle {
#         before_count => 3
#         after_count => 5
#         period => 3600
#         max_age => 7200
#         key => "%{host}%{message}"
#         add_tag => "throttled"
#       }
#       if "throttled" in [tags] {
#         drop { }
#       }
#     }
#
# Another case would be to store all events, but only email non-throttled events
# so the op's inbox isn't flooded with emails in the event of a system error.
# This configuration might appear as:
# [source,ruby]
#     filter {
#       throttle {
#         before_count => 3
#         after_count => 5
#         period => 3600
#         max_age => 7200
#         key => "%{message}"
#         add_tag => "throttled"
#       }
#     }
#     output {
#       if "throttled" not in [tags] {
#         email {
#           from => "logstash@mycompany.com"
#           subject => "Production System Alert"
#           to => "ops@mycompany.com"
#           via => "sendmail"
#           body => "Alert on %{host} from path %{path}:\n\n%{message}"
#           options => { "location" => "/usr/sbin/sendmail" }
#         }
#       }
#       elasticsearch_http {
#         host => "localhost"
#         port => "19200"
#       }
#     }
#
# When an event is received, the event key is stored in a key_cache.  The key references
# a timeslot_cache.  The event is allocated to a timeslot (created dynamically) based on
# the timestamp of the event.  The timeslot counter is incremented.  When the next event is
# received (same key), within the same "period", it is allocated to the same timeslot.
# The timeslot counter is incremented once again.
#
# The timeslot expires if the maximum age has been exceeded.  The age is calculated
# based on the latest event timestamp and the max_age configuration option.
#
#         ---[::.. DESIGN ..::]---
#
# +- [key_cache] -+  +-- [timeslot_cache] --+
# |               |  | @created: 1439839636 |
#                    | @latest:  1439839836 |
#    [a.b.c]  =>     +----------------------+
#                    | [1439839636] => 1    |
#                    | [1439839736] => 3    |
#                    | [1439839836] => 2    |
#                    +----------------------+
#
#                    +-- [timeslot_cache] --+
#                    | @created: eeeeeeeeee |
#                    | @latest:  llllllllll |
#    [x.y.z]  =>     +----------------------+
#                    | [0000000060] => x    |
#                    | [0000000120] => y    |
# |               |  | [..........] => N    |
# +---------------+  +----------------------+
#
# Frank de Jong (@frapex)
# Mike Pilone (@mikepilone)
#

class ThreadSafe::TimeslotCache < ThreadSafe::Cache
  attr_reader :created

  def initialize(epoch, options = nil, &block)
    @created = epoch
    @latest = Atomic.new(epoch)

    super(options, &block)
  end

  def latest
    @latest.value
  end

  def latest=(val)
    # only update if greater than current
    @latest.update { |v| v = (val > v) ? val : v }
  end
end

class LogStash::Filters::Throttle < LogStash::Filters::Base
  # The name to use in configuration files.
  config_name "throttle"

  # The memory control mechanism automatically ajusts the maximum age
  # of a timeslot based on the maximum number of counters.
  MC_MIN_PCT = 5    # Lower bound percentage.
  MC_MAX_PCT = 100  # Upper bound percentage.
  MC_INCR_PCT = 80  # Increase if total below percentage.
  MC_STEP_PCT = 5   # Increase/decrease by this percentage at a time.

  # Call the filter flush method at regular interval.  It is used by the memory
  # control mechanism.  Set to false if you like your VM to go (B)OOM.
  config :periodic_flush, :validate => :boolean, :default => true

  # The key used to identify events.  Events with the same key are grouped together.
  # Field substitutions are allowed, so you can combine multiple fields.
  config :key, :validate => :string, :required => true

  # Events less than this count will be throttled.  Setting this value to -1, the
  # default, will cause no events to be throttled based on the lower bound.
  config :before_count, :validate => :number, :default => -1, :required => false

  # Events greater than this count will be throttled.  Setting this value to -1, the
  # default, will cause no events to be throttled based on the upper bound.
  config :after_count, :validate => :number, :default => -1, :required => false

  # The period in seconds after the first occurrence of an event until a new timeslot
  # is created.  This period is tracked per unique key and per timeslot.
  # Field substitutions are allowed in this value.  This allows you to specify that
  # certain kinds of events throttle for a specific period of time.
  config :period, :validate => :string, :default => "60", :required => false

  # The maximum age of a timeslot.  Higher values allow better tracking of an asynchronous
  # flow of events, but require more memory.  As a rule of thumb you should set this value
  # to at least twice the period.  Or set this value to period + maximum time offset
  # between unordered events with the same key.  Values below the specified period give
  # unexpected results if unordered events are processed simultaneously.
  config :max_age, :validate => :number, :default => 3600, :required => false

  # The maximum number of counters to store before decreasing the maximum age of a timeslot.
  # Setting this value to -1 will prevent an upper bound with no constraint on the
  # number of counters.  This configuration value should only be used as a memory
  # control mechanism and can cause early counter expiration if the value is reached.
  # It is recommended to leave the default value and ensure that your key is selected
  # such that it limits the number of counters required (i.e. don't use UUID as the key).
  config :max_counters, :validate => :number, :default => 100000, :required => false

  # performs initialization of the filter
  public
  def register
    @key_cache = ThreadSafe::Cache.new
    @max_age_orig = @max_age
  end # def register

  # filters the event
  public
  def filter(event)
    key = event.sprintf(@key)                 # substitute field
    period = event.sprintf(@period).to_i      # substitute period
    period = 60 if period == 0                # fallback if unparsable
    epoch = event.timestamp.to_i              # event epoch time

    while true
      # initialise timeslot cache (if required)
      @key_cache.compute_if_absent(key) { ThreadSafe::TimeslotCache.new(epoch) }
      timeslot_cache = @key_cache[key]        # try to get timeslot cache
      break unless timeslot_cache.nil?        # retry until succesful

      @logger.warn? and @logger.warn(
        "filters/#{self.class.name}: timeslot cache disappeared, increase max_counters to prevent this.")
    end

    timeslot_cache.latest = epoch             # update to latest epoch

    # find target timeslot
    timeslot_key = epoch - (epoch - timeslot_cache.created) % period

    while true
      # initialise timeslot and counter (if required)
      timeslot_cache.compute_if_absent(timeslot_key) { Atomic.new(0) }
      timeslot = timeslot_cache[timeslot_key] # try to get timeslot
      break unless timeslot.nil?              # retry until succesful

      @logger.warn? and @logger.warn(
        "filters/#{self.class.name}: timeslot disappeared, increase max_age to prevent this.")
    end
      
    timeslot.update { |v| v + 1 }             # increment counter
    count = timeslot.value                    # get latest counter value

    @logger.debug? and @logger.debug(
      "filters/#{self.class.name}: counter incremented",
      { key: key, epoch: epoch, timeslot: timeslot_key, count: count }
    )

    # throttle event if counter value not in range
    if ((@before_count != -1 && count < @before_count) ||
        (@after_count != -1 && count > @after_count))
      @logger.debug? and @logger.debug(
        "filters/#{self.class.name}: throttling event",
        { key: key, epoch: epoch }
      )

      filter_matched(event)
    end

    # Delete expired timeslots older than the latest.  Do not use variable
    # timeslot_cache.latest for this.  If used, it might delete the latest timeslot.
    latest_timeslot = timeslot_cache.keys.max || 0
    timeslot_cache.each_key { |key| timeslot_cache.delete(key) if key < (latest_timeslot - @max_age) }
  end # def filter

  public
  def flush(options = {})
    max_latest = 0                            # get maximum epoch
    @key_cache.each_value { |tc| max_latest = tc.latest if tc.latest > max_latest }

    total_counters = 0
    @key_cache.each_pair do |key,timeslot_cache|
      if timeslot_cache.latest < max_latest - @max_age
        @key_cache.delete(key)                # delete expired timeslot cache
      else
        total_counters += timeslot_cache.size # get total number of counters
      end
    end

    @logger.debug? and @logger.debug(
      "filters/#{self.class.name}: statistics",
      { total_counters: total_counters, max_age: @max_age }
    )

    # memory control mechanism
    if @max_counters != -1
      over_limit = total_counters - @max_counters

      # decrease max age of timeslot cache by x percent
      if (over_limit > 0) && (@max_age > @max_age_orig * MC_MIN_PCT / 100)
        @max_age -= @max_age_orig * MC_STEP_PCT / 100
        @logger.warn? and @logger.warn(
          "filters/#{self.class.name}: Decreased timeslot max_age to #{@max_age} because " +
          "max_counters exceeded by #{over_limit}. Use a better key to prevent too many unique event counters.")

      # increase max age of timeslot cache by x percent
      elsif (@max_age < @max_age_orig * MC_MAX_PCT / 100) && (total_counters < (@max_counters * MC_INCR_PCT / 100))
        @max_age += @max_age_orig * MC_STEP_PCT / 100
        @logger.warn? and @logger.warn(
          "filters/#{self.class.name}: Increased timeslot max_age to #{@max_age} because max_counters no longer exceeded.")
      end
    end

    return
  end # def flush

end # class LogStash::Filters::Throttle
