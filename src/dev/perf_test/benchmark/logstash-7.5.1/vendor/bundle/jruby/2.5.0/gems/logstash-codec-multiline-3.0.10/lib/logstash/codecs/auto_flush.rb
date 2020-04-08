# encoding: utf-8
require "concurrent"
require "logstash/codecs/retriggerable_task"

module LogStash module Codecs class AutoFlush
  def initialize(mc, interval)
    @mc, @interval = mc, interval
    @stopped = Concurrent::AtomicBoolean.new # false by default
    @task = RetriggerableTask.new(@interval, self)
  end

  def timeout
    @mc.auto_flush
  end

  def start
    # can't start if pipeline is stopping
    return self if stopped?
    @task.retrigger
    self
  end

  def stopped?
    @stopped.value
  end

  def stop
    @stopped.make_true
    @task.close
  end
end

class AutoFlushUnset
  def initialize(mc, interval)
  end

  def stopped?
    true
  end

  def start
    self
  end

  def stop
    self
  end
end end end
