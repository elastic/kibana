require 'test_helper'

require 'metriks/counter'

class CounterTest < Test::Unit::TestCase
  include ThreadHelper

  def setup
    @counter = Metriks::Counter.new
  end

  def test_increment
    @counter.increment

    assert_equal 1, @counter.count
  end

  def test_increment_threaded
    thread 10, :n => 100 do
      @counter.increment
    end

    assert_equal 1000, @counter.count
  end

  def test_increment_by_more
    @counter.increment 10

    assert_equal 10, @counter.count
  end
  
  def test_increment_by_more_threaded
    thread 10, :n => 100 do
      @counter.increment 10
    end

    assert_equal 10000, @counter.count
  end
end
