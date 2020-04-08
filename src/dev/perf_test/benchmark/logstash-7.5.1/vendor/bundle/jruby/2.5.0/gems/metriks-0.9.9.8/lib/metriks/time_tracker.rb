module Metriks
  class TimeTracker
    def initialize(interval)
      @interval = interval
      @next_time = Time.now.to_f
    end

    def sleep
      sleep_time = next_time - Time.now.to_f
      if sleep_time > 0
        Kernel.sleep(sleep_time)
      end
    end

    def now_floored
      time = Time.now.to_i
      time - (time % @interval)
    end

    def next_time
      now = Time.now.to_f
      @next_time = now if @next_time <= now
      @next_time += @interval - (@next_time % @interval)
    end
  end
end
