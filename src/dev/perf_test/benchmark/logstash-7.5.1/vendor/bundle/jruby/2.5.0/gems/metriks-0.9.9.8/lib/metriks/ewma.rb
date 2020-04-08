require 'atomic'

module Metriks
  class EWMA
    INTERVAL = 5.0
    SECONDS_PER_MINUTE = 60.0

    ONE_MINUTE      = 1
    FIVE_MINUTES    = 5
    FIFTEEN_MINUTES = 15

    M1_ALPHA  = 1 - Math.exp(-INTERVAL / SECONDS_PER_MINUTE / ONE_MINUTE)
    M5_ALPHA  = 1 - Math.exp(-INTERVAL / SECONDS_PER_MINUTE / FIVE_MINUTES)
    M15_ALPHA = 1 - Math.exp(-INTERVAL / SECONDS_PER_MINUTE / FIFTEEN_MINUTES)

    def self.new_m1
      new(M1_ALPHA, INTERVAL)
    end

    def self.new_m5
      new(M5_ALPHA, INTERVAL)
    end

    def self.new_m15
      new(M15_ALPHA, INTERVAL)
    end

    def initialize(alpha, interval)
      @alpha    = alpha
      @interval = interval

      @initialized = false
      @rate        = Atomic.new(0.0)
      @uncounted   = Atomic.new(0)
    end

    def clear
      @initialized = false
      @rate.value = 0.0
      @uncounted.value = 0
    end

    def update(value)
      @uncounted.update { |v| v + value }
    end

    def tick
      count = @uncounted.swap(0)
      instant_rate = count / @interval.to_f

      if @initialized
        @rate.update { |v| v + @alpha * (instant_rate - v) }
      else
        @rate.value = instant_rate
        @initialized = true
      end
    end

    def rate
      @rate.value
    end
  end
end