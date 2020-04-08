# encoding: utf-8
require "concurrent"

module LogStash module Config module Defaults

  extend self

  def input
    "input { stdin { type => stdin } }"
  end

  def output
    "output { stdout { codec => rubydebug } }"
  end

  def cpu_cores
    Concurrent.processor_count
  end
end end end
