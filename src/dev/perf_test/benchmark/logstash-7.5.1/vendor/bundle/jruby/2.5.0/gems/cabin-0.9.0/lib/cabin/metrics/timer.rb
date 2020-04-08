require "cabin/namespace"
require "cabin/metrics/histogram"

class Cabin::Metrics::Timer < Cabin::Metrics::Histogram
  # Start timing something.
  #
  # If no block is given
  # If a block is given, the execution of that block is timed.
  #
  public
  def time(&block)
    return time_block(&block) if block_given?

    # Return an object we can .stop
    # Call record(...) when we stop.
    return TimerContext.new { |duration| record(duration) }
  end # def time

  private
  def time_block(&block)
    start = Time.now
    block.call
    record(Time.now - start)
  end # def time_block

  class TimerContext
    public
    def initialize(&stop_callback)
      @start = Time.now
      @callback = stop_callback
    end

    public
    def stop
      duration = Time.now - @start
      @callback.call(duration)
    end # def stop
  end # class TimerContext
end # class Cabin::Metrics::Timer
