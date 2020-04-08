require 'test_helper'

class MetriksTest < Test::Unit::TestCase
  def setup
    Metriks::Registry.default.clear
  end

  def teardown
    Metriks::Registry.default.clear
  end

  def test_counter
    assert_not_nil Metriks.counter('testing')
  end

  def test_meter
    assert_not_nil Metriks.meter('testing')
  end

  def test_timer
    assert_not_nil Metriks.timer('testing')
  end

  def test_utilization_timer
    assert_not_nil Metriks.utilization_timer('testing')
  end

  def test_histogram
    assert_not_nil Metriks.histogram('testing')
  end
end