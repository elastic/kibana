# encoding: utf-8
require "logstash/instrument/metric_type/counter"
require "logstash/instrument/metric_type/gauge"

module LogStash module Instrument
  module MetricType
    METRIC_TYPE_LIST = {
      :counter => LogStash::Instrument::MetricType::Counter,
      :gauge => LogStash::Instrument::MetricType::Gauge
    }.freeze

    # Use the string to generate a concrete class for this metrics
    #
    # @param [String] The name of the class
    # @param [Array] Namespaces list
    # @param [String] The metric key
    # @raise [NameError] If the class is not found
    def self.create(type, namespaces, key)
      METRIC_TYPE_LIST[type].new(namespaces, key)
    end
  end
end; end
