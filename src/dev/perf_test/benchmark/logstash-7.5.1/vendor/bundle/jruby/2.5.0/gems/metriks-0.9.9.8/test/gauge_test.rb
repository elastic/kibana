require 'test_helper'

require 'metriks/gauge'

class GaugeTest < Test::Unit::TestCase
  def test_gauge
    gauge = Metriks::Gauge.new

    3.times do |i|
      gauge.set(i + 1)
    end

    assert_equal 3, gauge.value

    gauge.set(1)

    assert_equal 1, gauge.value
  end

  def test_gauge_default
    gauge = Metriks::Gauge.new
    assert_equal nil, gauge.value
  end

  def test_gauge_callback_via_block
    gauge = Metriks::Gauge.new { 56 }

    assert_equal 56, gauge.value
  end

  def test_gauge_callback_via_callable_object
    callable = Class.new(Struct.new(:value)) {
      def call
        value
      end
    }

    gauge = Metriks::Gauge.new(callable.new(987))

    assert_equal 987, gauge.value

    gauge = Metriks::Gauge.new(proc { 123 })

    assert_equal 123, gauge.value
  end
end
