require 'atomic'
require 'metriks/snapshot'

module Metriks
  class UniformSample
    def initialize(reservoir_size)
      @values = Array.new(reservoir_size, 0)
      @count  = Atomic.new(0)
    end

    def clear
      @values.length.times do |idx|
        @values[idx] = 0
      end
      @count.value = 0
    end

    def size
      count = @count.value
      count > @values.length ? @values.length : count
    end

    def snapshot
      Snapshot.new(@values.slice(0, size))
    end

    def update(value)
      new_count = @count.update { |v| v + 1 }

      if new_count <= @values.length
        @values[new_count - 1] = value
      else
        idx = rand(new_count)
        if idx < @values.length
          @values[idx] = value
        end
      end
    end
  end
end