module Metriks
  class Snapshot
    MEDIAN_Q = 0.5
    P75_Q = 0.75
    P95_Q = 0.95
    P98_Q = 0.98
    P99_Q = 0.99
    P999_Q = 0.999

    attr_reader :values

    def initialize(values)
      @values = values.sort
    end

    def value(quantile)
      raise ArgumentError, "quantile must be between 0.0 and 1.0" if quantile < 0.0 || quantile > 1.0

      return 0.0 if @values.empty?

      pos = quantile * (@values.length + 1)

      return @values.first if pos < 1
      return @values.last if pos >= @values.length

      lower = @values[pos.to_i - 1]
      upper = @values[pos.to_i]
      lower + (pos - pos.floor) * (upper - lower)
    end

    def size
      @values.length
    end

    def median
      value(MEDIAN_Q)
    end

    def get_75th_percentile
      value(P75_Q)
    end

    def get_95th_percentile
      value(P95_Q)
    end

    def get_98th_percentile
      value(P98_Q)
    end

    def get_99th_percentile
      value(P99_Q)
    end

    def get_999th_percentile
      value(P999_Q)
    end
  end
end
