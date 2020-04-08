require "cabin/namespace"
require "cabin/metric"
require "thread"

class Cabin::Metrics::Histogram
  include Cabin::Metric

  # A new Histogram. 
  public
  def initialize
    @lock = Mutex.new
    @inspectables = [ :@total, :@min, :@max, :@count, :@mean ]

    # Histogram should track many things, including:
    # - percentiles (50, 75, 90, 95, 99?)
    # - median
    # - max
    # - min
    # - total sum
    #
    # Sliding values of all of these?
    @total = 0
    @min = nil
    @max = nil
    @count = 0
    @mean = 0.0
  end # def initialize

  public
  def record(value)
    @lock.synchronize do
      @count += 1
      @total += value
      if @min.nil? or value < @min
        @min = value
      end
      if @max.nil? or value > @max
        @max = value
      end
      @mean = @total / @count
      # TODO(sissel): median
      # TODO(sissel): percentiles
    end
    emit
  end # def record

  # This is a very poor way to access the metric data.
  # TODO(sissel): Need to figure out a better interface.
  public
  def value
    return @lock.synchronize { @count }
  end # def value

  public
  def to_hash
    return @lock.synchronize do
      { 
        :count => @count,
        :total => @total,
        :min => @min,
        :max => @max,
        :mean => @mean,
      }
    end
  end # def to_hash
end # class Cabin::Metrics::Histogram
