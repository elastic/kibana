require 'atomic'

require 'metriks/ewma'

module Metriks
  class Meter
    TICK_INTERVAL = 5.0

    def initialize(averager_klass = Metriks::EWMA)
      @count = Atomic.new(0)
      @start_time = Time.now.to_f
      @last_tick = Atomic.new(@start_time)

      @m1_rate  = averager_klass.new_m1
      @m5_rate  = averager_klass.new_m5
      @m15_rate = averager_klass.new_m15
    end

    def clear
      @count.value = 0
      @start_time = Time.now.to_f
      @last_tick.value = @start_time
      @m1_rate.clear
      @m5_rate.clear
      @m15_rate.clear
    end

    def tick
      @m1_rate.tick
      @m5_rate.tick
      @m15_rate.tick
    end

    def tick_if_nessesary
      old_tick = @last_tick.value
      new_tick = Time.new.to_f
      age = new_tick - old_tick
      if age > TICK_INTERVAL && @last_tick.compare_and_swap(old_tick, new_tick)
        required_ticks = age / TICK_INTERVAL
        required_ticks.to_i.times do
          tick
        end
      end
    end

    def mark(val = 1)
      tick_if_nessesary
      @count.update { |v| v + val }
      @m1_rate.update(val)
      @m5_rate.update(val)
      @m15_rate.update(val)
    end

    def count
      @count.value
    end

    def one_minute_rate
      tick_if_nessesary
      @m1_rate.rate
    end

    def five_minute_rate
      tick_if_nessesary
      @m5_rate.rate
    end

    def fifteen_minute_rate
      tick_if_nessesary
      @m15_rate.rate
    end

    def mean_rate
      if count == 0
        return 0.0
      else
        elapsed = Time.now.to_f - @start_time
        count / elapsed
      end
    end

    def stop
    end
  end
end