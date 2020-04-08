#encoding: utf-8
java_import org.logstash.instrument.metrics.counter.LongCounter

module LogStash module Instrument module MetricType
  class Counter < LongCounter

    def initialize(namespaces, key)
      super(key.to_s)

    end

    def execute(action, value = 1)
      send(action, value)
    end

  end
end; end; end
