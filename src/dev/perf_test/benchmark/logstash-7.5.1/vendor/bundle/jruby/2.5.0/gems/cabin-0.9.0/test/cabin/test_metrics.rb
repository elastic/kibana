require "test_helper"
require "cabin/metrics"

describe Cabin::Metrics do
  before do
    @metrics = Cabin::Metrics.new
  end

  #test "gauge" do
    #gauge = @metrics.gauge(self) { 3 }
    #assert_equal(3, gauge.value)
    ## metrics.first == [identifier, Gauge]
    #assert_equal(3, @metrics.first.last.value)
  #end

  test "counter" do
    counter = @metrics.counter(self)
    0.upto(30) do |i|
      assert_equal(i, counter.value)
      assert_equal({ :value => i }, counter.to_hash)
      counter.incr
    end
    31.downto(0) do |i|
      assert_equal(i, counter.value)
      assert_equal({ :value => i }, counter.to_hash)
      counter.decr
    end
  end

  test "meter counter" do
    meter = @metrics.meter(self)
    30.times do |i|
      assert_equal(i, meter.value)
      assert_equal({ :value => i }, meter.to_hash)
      meter.mark
    end
  end

  test "meter time-based averages" # TODO(sissel): implement

  test "timer first-run has max == min" do
    timer = @metrics.timer(self)
    timer.time { true }
    assert_equal(timer.to_hash[:min], timer.to_hash[:max],
                 "With a single event, min and max must be equal")
  end

  test "timer counter" do
    timer = @metrics.timer(self)
    30.times do |i|
      assert_equal(i, timer.value)
      assert_equal(i, timer.to_hash[:count])
      timer.time { sleep(0.01) }
      assert(timer.to_hash[:total] > 0, "total should be nonzero")
      assert(timer.to_hash[:mean] > 0, "mean should be nonzero")
      assert(timer.to_hash[:max] > 0, "max should be nonzero")
    end
  end

  test "timer.time without block" do
    timer = @metrics.timer(self)
    30.times do |i|
      assert_equal(i, timer.value)
      assert_equal(i, timer.to_hash[:count])
      t = timer.time
      sleep(0.01)
      t.stop
      assert(timer.to_hash[:total] > 0, "total should be nonzero")
      assert(timer.to_hash[:mean] > 0, "mean should be nonzero")
      assert(timer.to_hash[:max] > 0, "max should be nonzero")
    end
  end

  test "metrics from Cabin::Metrics" do
    # Verify the Metrics api for creating new metrics.
    metrics = Cabin::Metrics.new
    assert(metrics.timer(self).is_a?(Cabin::Metrics::Timer))
    assert(metrics.counter(self).is_a?(Cabin::Metrics::Counter))
    assert(metrics.histogram(self).is_a?(Cabin::Metrics::Histogram))
    assert(metrics.meter(self).is_a?(Cabin::Metrics::Meter))
  end

  test "metrics from logger" do
    logger = Cabin::Channel.new
    meter = logger.metrics.meter(self)
    assert_equal(0, meter.value)
  end

  test "timer histogram" # TODO(sissel): implement
  test "histogram" # TODO(sissel): implement
end # describe Cabin::Channel do
