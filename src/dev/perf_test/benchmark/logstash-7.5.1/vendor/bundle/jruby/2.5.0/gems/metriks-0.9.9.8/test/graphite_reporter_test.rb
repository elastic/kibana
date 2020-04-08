require 'test_helper'
require 'thread_error_handling_tests'

require 'metriks/reporter/graphite'

class GraphiteReporterTest < Test::Unit::TestCase
  include ThreadErrorHandlingTests

  def build_reporter(options={})
    Metriks::Reporter::Graphite.new('localhost', 3333, { :registry => @registry }.merge(options))
  end

  def setup
    @registry = Metriks::Registry.new
    @reporter = build_reporter
    @stringio = StringIO.new

    @reporter.stubs(:socket).returns(@stringio)
  end

  def teardown
    @reporter.stop
    @registry.stop
  end

  def test_write
    @registry.meter('meter.testing').mark
    @registry.counter('counter.testing').increment
    @registry.timer('timer.testing').update(1.5)
    @registry.histogram('histogram.testing').update(1.5)
    @registry.utilization_timer('utilization_timer.testing').update(1.5)
    @registry.gauge('gauge.testing').set(123)
    @registry.gauge('gauge.testing.block') { 456 }

    @reporter.write

    assert_match /timer.testing.median \d/, @stringio.string
    assert_match /gauge.testing.value 123/, @stringio.string
    assert_match /gauge.testing.block.value 456/, @stringio.string
  end
end
