# encoding: utf-8
require "logstash/config/defaults"

module LogStash module Config module CpuCoreStrategy

  extend self

  def maximum
    LogStash::Config::Defaults.cpu_cores
  end

  def fifty_percent
    [1, (maximum * 0.5)].max.floor
  end

  def seventy_five_percent
    [1, (maximum * 0.75)].max.floor
  end

  def twenty_five_percent
    [1, (maximum * 0.25)].max.floor
  end

  def max_minus_one
    [1, (maximum - 1)].max.floor
  end

  def max_minus_two
    [1, (maximum - 2)].max.floor
  end
end end end
