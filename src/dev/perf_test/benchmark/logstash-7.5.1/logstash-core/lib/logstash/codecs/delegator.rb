module LogStash::Codecs
  class Delegator < SimpleDelegator
    def initialize(obj)
      super(obj)
      @encode_metric = LogStash::Instrument::NamespacedNullMetric.new
      @decode_metric = LogStash::Instrument::NamespacedNullMetric.new
    end

    def class
      __getobj__.class
    end

    def metric=(metric)
      __getobj__.metric = metric

      __getobj__.metric.gauge(:name, __getobj__.class.config_name)

      @encode_metric = __getobj__.metric.namespace(:encode)
      @encode_metric.counter(:writes_in)
      @encode_metric.report_time(:duration_in_millis, 0)

      @decode_metric = __getobj__.metric.namespace(:decode)
      @decode_metric.counter(:writes_in)
      @decode_metric.counter(:out)
      @decode_metric.report_time(:duration_in_millis, 0)
    end

    def encode(event)
      @encode_metric.increment(:writes_in)
      @encode_metric.time(:duration_in_millis) do
        __getobj__.encode(event)
      end
    end

    def multi_encode(events)
      @encode_metric.increment(:writes_in, events.length)
      @encode_metric.time(:duration_in_millis) do
        __getobj__.multi_encode(events)
      end
    end

    def decode(data)
      @decode_metric.increment(:writes_in)
      @decode_metric.time(:duration_in_millis) do
        __getobj__.decode(data) do |event|
          @decode_metric.increment(:out)
          yield event
        end
      end
    end
  end
end
