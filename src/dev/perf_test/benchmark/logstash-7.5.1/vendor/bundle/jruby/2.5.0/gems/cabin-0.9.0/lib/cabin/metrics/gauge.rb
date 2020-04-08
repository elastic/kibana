require "cabin/namespace"
require "cabin/metric"

class Cabin::Metrics::Gauge
  include Cabin::Metric

  # A new Gauge. The block given will be called every time the metric is read.
  public
  def initialize(&block)
    @inspectables = [ ]
    @block = block
  end # def initialize

  # Get the value of this metric.
  public
  def value
    return @block.call
  end # def value

  public
  def to_hash
    return { :value => value }
  end # def to_hash
end # class Cabin::Metrics::Gauge
