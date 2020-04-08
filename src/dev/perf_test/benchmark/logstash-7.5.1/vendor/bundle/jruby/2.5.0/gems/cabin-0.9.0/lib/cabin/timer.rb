require "cabin/namespace"

# A simple timer class for timing events like a stop watch. Normally you don't
# invoke this yourself, but you are welcome to do so.
#
# See also: Cabin::Channel#time
class Cabin::Timer
  def initialize(&block)
    @start = Time.now
    @callback = block if block_given?
  end # def initialize

  # Stop the clock and call the callback with the duration.
  # Also returns the duration of this timer.
  def stop
    duration = Time.now - @start
    @callback.call(duration) if @callback
    return duration
  end # def stop
end # class Cabin::Timer
