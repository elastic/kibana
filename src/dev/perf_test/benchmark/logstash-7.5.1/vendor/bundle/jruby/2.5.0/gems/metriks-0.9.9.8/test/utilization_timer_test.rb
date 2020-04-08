require 'test_helper'

require 'metriks/utilization_timer'

class UtilizationTimerTest < Test::Unit::TestCase
  def setup
    @timer = Metriks::UtilizationTimer.new
  end

  def teardown
    @timer.stop
  end

  def test_timer
    5.times do
      @timer.update(0.10)
      @timer.update(0.15)
    end

    @timer.instance_variable_get(:@meter).tick
    @timer.instance_variable_get(:@duration_meter).tick

    assert_in_delta 0.25, @timer.one_minute_utilization, 0.1
  end
end