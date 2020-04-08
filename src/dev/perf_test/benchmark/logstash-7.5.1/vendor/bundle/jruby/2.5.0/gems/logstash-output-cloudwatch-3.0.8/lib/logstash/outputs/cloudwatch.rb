# encoding: utf-8
require "logstash/outputs/base"
require "logstash/namespace"
require "logstash/plugin_mixins/aws_config"

# This output lets you aggregate and send metric data to AWS CloudWatch
#
# ==== Summary:
# This plugin is intended to be used on a logstash indexer agent (but that
# is not the only way, see below.)  In the intended scenario, one cloudwatch
# output plugin is configured, on the logstash indexer node, with just AWS API
# credentials, and possibly a region and/or a namespace.  The output looks
# for fields present in events, and when it finds them, it uses them to
# calculate aggregate statistics.  If the `metricname` option is set in this
# output, then any events which pass through it will be aggregated & sent to
# CloudWatch, but that is not recommended.  The intended use is to NOT set the
# metricname option here, and instead to add a `CW_metricname` field (and other
# fields) to only the events you want sent to CloudWatch.
#
# When events pass through this output they are queued for background
# aggregation and sending, which happens every minute by default.  The
# queue has a maximum size, and when it is full aggregated statistics will be
# sent to CloudWatch ahead of schedule. Whenever this happens a warning
# message is written to logstash's log.  If you see this you should increase
# the `queue_size` configuration option to avoid the extra API calls.  The queue
# is emptied every time we send data to CloudWatch.
#
# Note: when logstash is stopped the queue is destroyed before it can be processed.
# This is a known limitation of logstash and will hopefully be addressed in a
# future version.
#
# ==== Details:
# There are two ways to configure this plugin, and they can be used in
# combination: event fields & per-output defaults
#
# Event Field configuration...
# You add fields to your events in inputs & filters and this output reads
# those fields to aggregate events.  The names of the fields read are
# configurable via the `field_*` options.
#
# Per-output defaults...
# You set universal defaults in this output plugin's configuration, and
# if an event does not have a field for that option then the default is
# used.
#
# Notice, the event fields take precedence over the per-output defaults.
#
# At a minimum events must have a "metric name" to be sent to CloudWatch.
# This can be achieved either by providing a default here OR by adding a
# `CW_metricname` field. By default, if no other configuration is provided
# besides a metric name, then events will be counted (Unit: Count, Value: 1)
# by their metric name (either a default or from their `CW_metricname` field)
#
# Other fields which can be added to events to modify the behavior of this
# plugin are, `CW_namespace`, `CW_unit`, `CW_value`, and
# `CW_dimensions`.  All of these field names are configurable in
# this output.  You can also set per-output defaults for any of them.
# See below for details.
#
# Read more about http://aws.amazon.com/cloudwatch/[AWS CloudWatch],
# and the specific of API endpoint this output uses,
# http://docs.amazonwebservices.com/AmazonCloudWatch/latest/APIReference/API_PutMetricData.html[PutMetricData]
class LogStash::Outputs::CloudWatch < LogStash::Outputs::Base
  include LogStash::PluginMixins::AwsConfig::V2
  
  config_name "cloudwatch"

  # Constants
  # aggregate_key members
  DIMENSIONS = "dimensions"
  TIMESTAMP = "timestamp"
  METRIC = "metric"
  COUNT = "count"
  UNIT = "unit"
  SUM = "sum"
  MIN = "min"
  MAX = "max"
  # Units
  COUNT_UNIT = "Count"
  NONE = "None"

  # How often to send data to CloudWatch
  # This does not affect the event timestamps, events will always have their
  # actual timestamp (to-the-minute) sent to CloudWatch.
  #
  # We only call the API if there is data to send.
  #
  # See the Rufus Scheduler docs for an https://github.com/jmettraux/rufus-scheduler#the-time-strings-understood-by-rufus-scheduler[explanation of allowed values]
  config :timeframe, :validate => :string, :default => "1m"

  # How many events to queue before forcing a call to the CloudWatch API ahead of `timeframe` schedule
  # Set this to the number of events-per-timeframe you will be sending to CloudWatch to avoid extra API calls
  config :queue_size, :validate => :number, :default => 10000

  # How many data points can be given in one call to the CloudWatch API
  config :batch_size, :validate => :number, :default => 20

  # The default namespace to use for events which do not have a `CW_namespace` field
  config :namespace, :validate => :string, :default => "Logstash"

  # The name of the field used to set a different namespace per event
  # Note: Only one namespace can be sent to CloudWatch per API call
  # so setting different namespaces will increase the number of API calls
  # and those cost money.
  config :field_namespace, :validate => :string, :default => "CW_namespace"

  # The default metric name to use for events which do not have a `CW_metricname` field.
  # Beware: If this is provided then all events which pass through this output will be aggregated and
  # sent to CloudWatch, so use this carefully.  Furthermore, when providing this option, you
  # will probably want to also restrict events from passing through this output using event
  # type, tag, and field matching
  config :metricname, :validate => :string

  # The name of the field used to set the metric name on an event
  # The author of this plugin recommends adding this field to events in inputs &
  # filters rather than using the per-output default setting so that one output
  # plugin on your logstash indexer can serve all events (which of course had
  # fields set on your logstash shippers.)
  config :field_metricname, :validate => :string, :default => "CW_metricname"

  VALID_UNITS = ["Seconds", "Microseconds", "Milliseconds", "Bytes",
                 "Kilobytes", "Megabytes", "Gigabytes", "Terabytes",
                 "Bits", "Kilobits", "Megabits", "Gigabits", "Terabits",
                 "Percent", COUNT_UNIT, "Bytes/Second", "Kilobytes/Second",
                 "Megabytes/Second", "Gigabytes/Second", "Terabytes/Second",
                 "Bits/Second", "Kilobits/Second", "Megabits/Second",
                 "Gigabits/Second", "Terabits/Second", "Count/Second", NONE]

  # The default unit to use for events which do not have a `CW_unit` field
  # If you set this option you should probably set the "value" option along with it
  config :unit, :validate => VALID_UNITS, :default => COUNT_UNIT

  # The name of the field used to set the unit on an event metric
  config :field_unit, :validate => :string, :default => "CW_unit"

  # The default value to use for events which do not have a `CW_value` field
  # If provided, this must be a string which can be converted to a float, for example...
  #     "1", "2.34", ".5", and "0.67"
  # If you set this option you should probably set the `unit` option along with it
  config :value, :validate => :string, :default => "1"

  # The name of the field used to set the value (float) on an event metric
  config :field_value, :validate => :string, :default => "CW_value"

  # The default dimensions [ name, value, ... ] to use for events which do not have a `CW_dimensions` field
  config :dimensions, :validate => :hash

  # The name of the field used to set the dimensions on an event metric
  # The field named here, if present in an event, must have an array of
  # one or more key & value pairs, for example...
  #     `add_field => [ "CW_dimensions", "Environment", "CW_dimensions", "prod" ]`
  # or, equivalently...
  #     `add_field => [ "CW_dimensions", "Environment" ]`
  #     `add_field => [ "CW_dimensions", "prod" ]`
  config :field_dimensions, :validate => :string, :default => "CW_dimensions"

  public
  def register
    require "thread"
    require "rufus/scheduler"
    require "aws-sdk"

    @cw = Aws::CloudWatch::Client.new(aws_options_hash)

    @event_queue = SizedQueue.new(@queue_size)
    @scheduler = Rufus::Scheduler.new
    @job = @scheduler.every @timeframe do
      @logger.debug("Scheduler Activated")
      publish(aggregate({}))
    end
  end # def register

  public
  def receive(event)
    

    if event == LogStash::SHUTDOWN
      job.trigger()
      job.unschedule()
      @logger.info("CloudWatch aggregator thread shutdown.")
      return
    end

    return unless (event.get(@field_metricname) || @metricname)

    if (@event_queue.length >= @event_queue.max)
      @job.trigger
      @logger.warn("Posted to AWS CloudWatch ahead of schedule.  If you see this often, consider increasing the cloudwatch queue_size option.")
    end

    @logger.debug("Queueing event", :event => event)
    @event_queue << event
  end # def receive

  private
  def publish(aggregates)
    aggregates.each do |namespace, data|
      @logger.debug("Namespace, data: ", :namespace => namespace, :data => data)
      metric_data = []
      data.each do |aggregate_key, stats|
        new_data = {
            :metric_name => aggregate_key[METRIC],
            :timestamp => aggregate_key[TIMESTAMP],
            :unit => aggregate_key[UNIT],
            :statistic_values => {
                :sample_count => stats[COUNT],
                :sum => stats[SUM],
                :minimum => stats[MIN],
                :maximum => stats[MAX],
            }
        }
        dims = aggregate_key[DIMENSIONS]
        if (dims.is_a?(Array) && dims.length > 0 && (dims.length % 2) == 0)
          new_data[:dimensions] = Array.new
          i = 0
          while (i < dims.length)
            new_data[:dimensions] << {:name => dims[i], :value => dims[i+1]}
            i += 2
          end
        end
        metric_data << new_data
      end # data.each

      metric_data.each_slice(@batch_size) do |batch|
        begin
          @cw.put_metric_data(
              :namespace => namespace,
              :metric_data => batch
          )
          @logger.debug("Sent data to AWS CloudWatch OK", :namespace => namespace, :metric_data => batch)
        rescue Exception => e
          @logger.warn("Failed to send to AWS CloudWatch", :exception => e, :namespace => namespace, :metric_data => batch)
          break
        end
      end
    end # aggregates.each
    return aggregates
  end# def publish

  private
  def aggregate(aggregates)
    @logger.debug("QUEUE SIZE ", :queuesize => @event_queue.size)
    while !@event_queue.empty? do
      begin
        count(aggregates, @event_queue.pop(true))
      rescue Exception => e
        @logger.warn("Exception!  Breaking count loop", :exception => e)
        break
      end
    end
    return aggregates
  end # def aggregate

  private
  def count(aggregates, event)
    # If the event doesn't declare a namespace, use the default
    fnamespace = field(event, @field_namespace)
    namespace = (fnamespace ? fnamespace : event.sprintf(@namespace))

    funit = field(event, @field_unit)
    unit = (funit ? funit : event.sprintf(@unit))

    fvalue = field(event, @field_value)
    value = (fvalue ? fvalue : event.sprintf(@value))

    # We may get to this point with valid Units but missing value.  Send zeros.
    val = (!value) ? 0.0 : value.to_f

    # Event provides exactly one (but not both) of value or unit
    if ( (fvalue == nil) ^ (funit == nil) )
      @logger.warn("Likely config error: event has one of #{@field_value} or #{@field_unit} fields but not both.", :event => event)
    end

    # If Unit is still not set or is invalid warn about misconfiguration & use NONE
    if (!VALID_UNITS.include?(unit))
      unit = NONE
      @logger.warn("Likely config error: invalid or missing Units (#{unit.to_s}), using '#{NONE}' instead", :event => event)
    end

    if (!aggregates[namespace])
      aggregates[namespace] = {}
    end

    dims = event.get(@field_dimensions)
    if (dims) # event provides dimensions
              # validate the structure
      if (!dims.is_a?(Array) || dims.length == 0 || (dims.length % 2) != 0)
        @logger.warn("Likely config error: CloudWatch dimensions field (#{dims.to_s}) found which is not a positive- & even-length array.  Ignoring it.", :event => event)
        dims = nil
      end
              # Best case, we get here and exit the conditional because dims...
              # - is an array
              # - with positive length
              # - and an even number of elements
    elsif (@dimensions.is_a?(Hash)) # event did not provide dimensions, but the output has been configured with a default
      dims = @dimensions.flatten.map{|d| event.sprintf(d)} # into the kind of array described just above
    else
      dims = nil
    end

    fmetric = field(event, @field_metricname)
    aggregate_key = {
        METRIC => (fmetric ? fmetric : event.sprintf(@metricname)),
        DIMENSIONS => dims,
        UNIT => unit,
        TIMESTAMP => event.sprintf("%{+YYYY-MM-dd'T'HH:mm:00Z}")
    }

    if (!aggregates[namespace][aggregate_key])
      aggregates[namespace][aggregate_key] = {}
    end

    if (!aggregates[namespace][aggregate_key][MAX] || val > aggregates[namespace][aggregate_key][MAX])
      aggregates[namespace][aggregate_key][MAX] = val
    end

    if (!aggregates[namespace][aggregate_key][MIN] || val < aggregates[namespace][aggregate_key][MIN])
      aggregates[namespace][aggregate_key][MIN] = val
    end

    if (!aggregates[namespace][aggregate_key][COUNT])
      aggregates[namespace][aggregate_key][COUNT] = 1
    else
      aggregates[namespace][aggregate_key][COUNT] += 1
    end

    if (!aggregates[namespace][aggregate_key][SUM])
      aggregates[namespace][aggregate_key][SUM] = val
    else
      aggregates[namespace][aggregate_key][SUM] += val
    end
  end # def count

  private
  def field(event, fieldname)
    if !event.get(fieldname)
      return nil
    else
      if event.get(fieldname).is_a?(Array)
        return event.get(fieldname).first
      else
        return event.get(fieldname)
      end
    end
  end # def field

end # class LogStash::Outputs::CloudWatch
