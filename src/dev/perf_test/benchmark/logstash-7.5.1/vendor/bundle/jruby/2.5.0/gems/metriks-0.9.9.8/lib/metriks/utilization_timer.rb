require 'metriks/timer'

module Metriks
  class UtilizationTimer < Metriks::Timer
    def initialize
      super
      @duration_meter = Metriks::Meter.new
    end

    def clear
      super
      @duration_meter.clear
    end

    def update(duration)
      super
      if duration >= 0
        @duration_meter.mark(duration)
      end
    end

    def one_minute_utilization
      @duration_meter.one_minute_rate
    end

    def five_minute_utilization
      @duration_meter.five_minute_rate
    end

    def fifteen_minute_utilization
      @duration_meter.fifteen_minute_rate
    end

    def mean_utilization
      @duration_meter.mean_rate
    end

    def stop
      super
      @duration_meter.stop
    end
  end
end