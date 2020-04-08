require "rubygems"
require "cabin"
require "logger"

# Logging::... is something I'm implemented and experimenting with.
@logger = Cabin::Channel.new

# Metrics can be subscribed-to as well.
@logger.subscribe(Logger.new(STDOUT))

counter = @logger.metrics.counter("mycounter")
counter.incr
counter.incr
counter.incr
counter.decr

meter = @logger.metrics.meter("something", "hello-world")
meter.mark
meter.mark
meter.mark

# If nil is passed as the 'instance' then the metric class name will be
# used instead.
timer = @logger.metrics.timer("ticktock")
5.times do
  timer.time do
    sleep rand * 2
  end
end

3.times do
  # Another way to do timing.
  clock = timer.time
  sleep rand * 2
  clock.stop
end

# Loop through all metrics:
@logger.metrics.each do |metric|
  @logger.info(metric.inspect)
end
