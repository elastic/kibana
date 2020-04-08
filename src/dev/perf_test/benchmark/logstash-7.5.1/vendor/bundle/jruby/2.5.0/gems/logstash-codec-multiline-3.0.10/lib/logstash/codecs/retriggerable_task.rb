require "concurrent"

module LogStash module Codecs class RetriggerableTask
  SLEEP_FOR = 0.25.freeze

  attr_reader :thread

  def initialize(delay, listener)
    @count = calculate_count(delay)
    @listener = listener
    @counter = Concurrent::AtomicFixnum.new(0 + @count)
    @stopped = Concurrent::AtomicBoolean.new(false)
    @semaphore = Concurrent::Semaphore.new(1)
  end

  def retrigger
    return if stopped?
    if executing?
      @semaphore.acquire
    end

    if pending?
      reset_counter
    else
      start
    end
  end

  def close
    @stopped.make_true
  end

  def counter
    @counter.value
  end

  def executing?
    running? && counter < 1
  end

  def pending?
    running? && counter > 0
  end

  private

  def calculate_count(value)
    # in multiples of SLEEP_FOR (0.25) seconds
    # if delay is 10 seconds then count is 40
    # this only works when SLEEP_FOR is less than 1
    return 1 if value < SLEEP_FOR
    (value / SLEEP_FOR).floor
  end

  def reset_counter
    @counter.value = 0 + @count
  end

  def running?
    @thread && @thread.alive?
  end

  def start()
    reset_counter
    @thread = Thread.new do
      while counter > 0
        break if stopped?
        sleep SLEEP_FOR
        @counter.decrement
      end

      @semaphore.drain_permits
      @listener.timeout if !stopped?
      @semaphore.release
    end
  end

  def stopped?
    @stopped.value
  end
end end end
