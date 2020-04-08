require 'atomic'

module Metriks
  # Public: Counters are one of the simplest metrics whose only operations
  # are increment and decrement.
  class Counter
    # Public: Initialize a new Counter.
    def initialize
      @count = Atomic.new(0)
    end

    # Public: Reset the counter back to 0
    #
    # Returns nothing.
    def clear
      @count.value = 0
    end

    # Public: Increment the counter.
    #
    # incr - The value to add to the counter.
    #
    # Returns nothing.
    def increment(incr = 1)
      @count.update { |v| v + incr }
    end

    # Public: Decrement the counter.
    #
    # decr - The value to subtract from the counter.
    #
    # Returns nothing.
    def decrement(decr = 1)
      @count.update { |v| v - decr }
    end

    # Public: The current count.
    #
    # Returns the count.
    def count
      @count.value
    end
  end
end