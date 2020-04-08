require "cabin/namespace"
require "cabin/metrics/gauge"
require "cabin/metrics/meter"
require "cabin/metrics/counter"
require "cabin/metrics/timer"
require "cabin/metrics/histogram"
require "cabin/publisher"
require "cabin/channel"

# What type of metrics do we want?
#
# What metrics should come by default?
# Per-call/transaction/request metrics like:
#   - hit (count++ type metrics)
#   - latencies/timings
#
# Per app or generally long-lifetime metrics like:
#   - "uptime"
#   - cpu usage
#   - memory usage
#   - count of active/in-flight actions/requests/calls/transactions
#   - peer metrics (number of cluster members, etc)
# ------------------------------------------------------------------
# https://github.com/codahale/metrics/tree/master/metrics-core/src/main/java/com/yammer/metrics/core
# Reading what Coda Hale's "Metrics" stuff has, here's my summary:
#
#   gauges (callback to return a number)
#   counters (.inc and .dec methods)
#   meters (.mark to track each 'hit')
#     Also exposes 1, 5, 15 minute moving averages
#   histograms: (.update(value) to record a new value)
#     like meter, but takes values more than simply '1'
#     as a result, exposes percentiles, median, etc.
#   timers
#     a time-observing interface on top of histogram.
#
# With the exception of gauges, all the other metrics are all active/pushed.
# Gauges take callbacks, so their values are pulled, not pushed. The active
# metrics can be represented as events since they the update occurs at the
# time of the change.
#
# These active/push metrics can therefore be considered events.
#
# All metrics (active/passive) can be queried for 'current state', too,
# making this suitable for serving to interested parties like monitoring
# and management tools.
class Cabin::Metrics
  include Enumerable
  include Cabin::Publisher

  # Get us a new metrics container.
  public
  def initialize
    @metrics_lock = Mutex.new
    @metrics = {}
  end # def initialize

  private
  def create(instance, name, metric_object)
    if !instance.is_a?(String)
      instance = "#{instance.class.name}<#{instance.object_id}>"
    end

    if name.nil?
      # If no name is given, use the class name of the metric.
      # For example, if we invoke Metrics#timer("foo"), the metric
      # name will be "foo/timer"
      metric_name = "#{instance}/#{metric_object.class.name.split("::").last.downcase}"
    else
      # Otherwise, use "instance/name" as the name.
      metric_name = "#{instance}/#{name}"
    end

    metric_object.channel = @channel
    metric_object.instance = metric_name

    if @channel
      @channel.debug("Created metric", :instance => instance, :type => metric_object.class)
    end
    return @metrics_lock.synchronize do
      @metrics[metric_name] = metric_object
    end
  end # def create

  # Create a new Counter metric
  # 'instance' is usually an object owning this metric, but it can be a string.
  # 'name' is the name of the metric.
  public
  def counter(instance, name=nil)
    return create(instance, name, Cabin::Metrics::Counter.new)
  end # def counter

  # Create a new Meter metric
  # 'instance' is usually an object owning this metric, but it can be a string.
  # 'name' is the name of the metric.
  public
  def meter(instance, name=nil)
    return create(instance, name, Cabin::Metrics::Meter.new)
  end # def meter

  # Create a new Histogram metric
  # 'instance' is usually an object owning this metric, but it can be a string.
  # 'name' is the name of the metric.
  public
  def histogram(instance, name=nil)
    return create(instance, name, Cabin::Metrics::Histogram.new)
  end # def histogram

  # Create a new Timer metric
  # 'instance' is usually an object owning this metric, but it can be a string.
  # 'name' is the name of the metric.
  public
  def timer(instance, name=nil)
    return create(instance, name, Cabin::Metrics::Timer.new)
  end # def timer
  
  # iterate over each metric. yields identifer, metric
  def each(&block)
    # delegate to the @metrics hash until we need something fancier
    @metrics_lock.synchronize do
      @metrics.each(&block)
    end
  end # def each
end # class Cabin::Metrics
