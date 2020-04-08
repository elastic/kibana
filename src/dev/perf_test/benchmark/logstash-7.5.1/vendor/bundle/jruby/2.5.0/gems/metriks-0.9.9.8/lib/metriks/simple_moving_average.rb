require 'atomic'

module Metriks
  class SimpleMovingAverage
    INTERVAL = 5.0
    SECONDS_PER_MINUTE = 60.0

    ONE_MINUTE      = 1
    FIVE_MINUTES    = 5
    FIFTEEN_MINUTES = 15

    def self.new_m1
      new(ONE_MINUTE * SECONDS_PER_MINUTE, INTERVAL)
    end

    def self.new_m5
      new(FIVE_MINUTES * SECONDS_PER_MINUTE, INTERVAL)
    end

    def self.new_m15
      new(FIFTEEN_MINUTES * SECONDS_PER_MINUTE, INTERVAL)
    end

    def initialize(duration, interval)
      @interval = interval
      @duration = duration

      @values = Array.new((duration / interval).to_i) { Atomic.new(nil) }
      @index  = Atomic.new(0)
    end

    def clear
      @values.each do |value|
        value.value = nil
      end
      @index.value = 0
    end

    def update(value)
      @values[@index.value].update { |v| v ? v + value : value }
    end

    def tick
      @index.update { |v| v < @values.length - 1 ? v + 1 : 0 }
    end

    def rate
      num, count = 0.0, 0.0

      @values.each do |value|
        if v = value.value
          num   += v
          count += 1
        end
      end

      num / count / @interval.to_f
    end
  end
end