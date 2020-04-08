require 'test_helper'

require 'metriks/histogram'

class HistogramTest < Test::Unit::TestCase
  include ThreadHelper

  def setup
  end

  def test_uniform_sample_min
    @histogram = Metriks::Histogram.new(Metriks::UniformSample.new(Metriks::Histogram::DEFAULT_SAMPLE_SIZE))

    @histogram.update(5)
    @histogram.update(10)

    assert_equal 5, @histogram.min
  end

  def test_uniform_sample_max
    @histogram = Metriks::Histogram.new(Metriks::UniformSample.new(Metriks::Histogram::DEFAULT_SAMPLE_SIZE))

    @histogram.update(5)
    @histogram.update(10)

    assert_equal 10, @histogram.max
  end

  def test_uniform_sample_mean
    @histogram = Metriks::Histogram.new(Metriks::UniformSample.new(Metriks::Histogram::DEFAULT_SAMPLE_SIZE))

    @histogram.update(5)
    @histogram.update(10)

    assert_equal 7, @histogram.mean
  end

  def test_uniform_sample_mean_threaded
    @histogram = Metriks::Histogram.new(Metriks::UniformSample.new(Metriks::Histogram::DEFAULT_SAMPLE_SIZE))

    thread 10, :n => 100 do
      @histogram.update(5)
      @histogram.update(10)
    end

    assert_equal 7, @histogram.mean
  end
  
  def test_uniform_sample_2000
    @histogram = Metriks::Histogram.new(Metriks::UniformSample.new(Metriks::Histogram::DEFAULT_SAMPLE_SIZE))

    2000.times do |idx|
      @histogram.update(idx)
    end

    assert_equal 1999, @histogram.max
  end
  
  def test_uniform_sample_2000_threaded
    @histogram = Metriks::Histogram.new(Metriks::UniformSample.new(Metriks::Histogram::DEFAULT_SAMPLE_SIZE))

    t = 10
    thread t do |i|
      2000.times do |x|
        if (x % t) == i
          @histogram.update x
        end
      end
    end

    assert_equal 1999, @histogram.max
  end

  def test_uniform_sample_snashot
    @histogram = Metriks::Histogram.new(Metriks::UniformSample.new(Metriks::Histogram::DEFAULT_SAMPLE_SIZE))

    100.times do |idx|
      @histogram.update(idx)
    end

    snapshot = @histogram.snapshot

    assert_equal 49.5, snapshot.median
  end

  def test_uniform_sample_snapshot_threaded
    @histogram = Metriks::Histogram.new(Metriks::UniformSample.new(Metriks::Histogram::DEFAULT_SAMPLE_SIZE))

    thread 10 do
      100.times do |idx|
        @histogram.update(idx)
      end
    end

    snapshot = @histogram.snapshot

    assert_equal 49.5, snapshot.median
  end

  def test_exponential_sample_min
    @histogram = Metriks::Histogram.new(Metriks::ExponentiallyDecayingSample.new(Metriks::Histogram::DEFAULT_SAMPLE_SIZE, Metriks::Histogram::DEFAULT_ALPHA))

    @histogram.update(5)
    @histogram.update(10)

    assert_equal 5, @histogram.min
  end
  
  def test_exponential_sample_max
    @histogram = Metriks::Histogram.new(Metriks::ExponentiallyDecayingSample.new(Metriks::Histogram::DEFAULT_SAMPLE_SIZE, Metriks::Histogram::DEFAULT_ALPHA))

    @histogram.update(5)
    @histogram.update(10)

    assert_equal 10, @histogram.max
  end

  def test_exponential_sample_mean
    @histogram = Metriks::Histogram.new(Metriks::ExponentiallyDecayingSample.new(Metriks::Histogram::DEFAULT_SAMPLE_SIZE, Metriks::Histogram::DEFAULT_ALPHA))

    @histogram.update(5)
    @histogram.update(10)

    assert_equal 7, @histogram.mean
  end
  
  def test_exponential_sample_mean_threaded
    @histogram = Metriks::Histogram.new(Metriks::ExponentiallyDecayingSample.new(Metriks::Histogram::DEFAULT_SAMPLE_SIZE, Metriks::Histogram::DEFAULT_ALPHA))

    thread 10, :n => 100 do
      @histogram.update(5)
      @histogram.update(10)
    end

    assert_equal 7, @histogram.mean
  end

  def test_exponential_sample_2000
    @histogram = Metriks::Histogram.new(Metriks::ExponentiallyDecayingSample.new(Metriks::Histogram::DEFAULT_SAMPLE_SIZE, Metriks::Histogram::DEFAULT_ALPHA))

    2000.times do |idx|
      @histogram.update(idx)
    end

    assert_equal 1999, @histogram.max
  end
  
  def test_exponential_sample_2000_threaded
    @histogram = Metriks::Histogram.new(Metriks::ExponentiallyDecayingSample.new(Metriks::Histogram::DEFAULT_SAMPLE_SIZE, Metriks::Histogram::DEFAULT_ALPHA))

    t = 10
    thread t do |i|
      2000.times do |idx|
        if (idx % t) == i
          @histogram.update(idx)
        end
      end
    end

    assert_equal 1999, @histogram.max
  end

  def test_exponential_sample_snashot
    @histogram = Metriks::Histogram.new(Metriks::ExponentiallyDecayingSample.new(Metriks::Histogram::DEFAULT_SAMPLE_SIZE, Metriks::Histogram::DEFAULT_ALPHA))

    100.times do |idx|
      @histogram.update(idx)
    end

    snapshot = @histogram.snapshot

    assert_equal 49.5, snapshot.median
  end

  def test_exponential_sample_snapshot_threaded
    @histogram = Metriks::Histogram.new(Metriks::ExponentiallyDecayingSample.new(Metriks::Histogram::DEFAULT_SAMPLE_SIZE, Metriks::Histogram::DEFAULT_ALPHA))

    thread 10 do
      100.times do |idx|
        @histogram.update(idx)
      end
    end

    snapshot = @histogram.snapshot

    assert_equal 49.5, snapshot.median
  end

  def test_long_idle_sample
    Time.stubs(:now).returns(Time.at(2000))
    sample = Metriks::ExponentiallyDecayingSample.new(Metriks::Histogram::DEFAULT_SAMPLE_SIZE, Metriks::Histogram::DEFAULT_ALPHA)
    Time.unstub(:now)
    @histogram = Metriks::Histogram.new(sample)

    @histogram.update(5)

    assert_equal 5, @histogram.min
  end
end
