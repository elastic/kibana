# encoding: utf-8
java_import org.logstash.instrument.metrics.gauge.LazyDelegatingGauge
module LogStash module Instrument module MetricType
  class Gauge < LazyDelegatingGauge

    def initialize(namespaces, key)
      super(key.to_s)
    end

    def execute(action, value = nil)
      send(action, value)
    end

  end
end; end; end

