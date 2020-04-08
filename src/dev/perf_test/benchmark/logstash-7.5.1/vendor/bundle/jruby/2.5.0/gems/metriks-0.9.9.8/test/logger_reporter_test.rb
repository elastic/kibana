require 'test_helper'
require 'thread_error_handling_tests'

require 'logger'
require 'metriks/reporter/logger'

class LoggerReporterTest < Test::Unit::TestCase
  include ThreadErrorHandlingTests

  def build_reporter(options={})
    Metriks::Reporter::Logger.new({ :registry => @registry, :logger => @logger }.merge(options))
  end

  def setup
    @stringio = StringIO.new
    @logger   = ::Logger.new(@stringio)
    @registry = Metriks::Registry.new

    @reporter = build_reporter

    @registry.meter('meter.testing').mark
    @registry.counter('counter.testing').increment
    @registry.timer('timer.testing').update(1.5)
    @registry.histogram('histogram.testing').update(1.5)
    @registry.utilization_timer('utilization_timer.testing').update(1.5)
    @registry.gauge('gauge.testing').set(123)
  end

  def teardown
    @reporter.stop
    @registry.stop
  end

  def test_write
    @reporter.write

    assert_match /time=\d/, @stringio.string
    assert_match /median=\d/, @stringio.string
    assert_match /value=123/, @stringio.string
  end

  def test_flush
    @reporter.flush

    assert_match /time=\d/, @stringio.string
    assert_match /median=\d/, @stringio.string
    assert_match /value=123/, @stringio.string
  end
end
