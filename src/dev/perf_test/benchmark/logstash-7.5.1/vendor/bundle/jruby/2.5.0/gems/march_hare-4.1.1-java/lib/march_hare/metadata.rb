module MarchHare
  class Headers
    attr_reader :channel, :consumer_tag, :envelope, :properties

    def initialize(channel, consumer_tag, envelope, properties)
      @channel      = channel
      @consumer_tag = consumer_tag
      @envelope     = envelope
      @properties   = properties

      # Prime the delivery tag when the instance is created. If #delivery_tag is first
      # called after a recovery, then it'll fail to mismatch and will allow an invalid
      # ack/nack, which will cause the channel to unexpectedly close
      @delivery_tag = delivery_tag
    end

    def ack(options={})
      @channel.basic_ack(delivery_tag, options.fetch(:multiple, false))
    end

    def reject(options={})
      @channel.basic_reject(delivery_tag, options.fetch(:requeue, false))
    end

    begin :envelope_delegation
      [
        :routing_key,
        :redeliver,
        :exchange
      ].each do |envelope_property|
        define_method(envelope_property) { @envelope.__send__(envelope_property) }
      end

      alias_method :redelivered?, :redeliver
    end

    def delivery_tag
      @delivery_tag ||= VersionedDeliveryTag.new(@envelope.delivery_tag, @channel.recoveries_counter.get)
    end

    begin :message_properties_delegation
      [
        :content_encoding,
        :content_type,
        :content_encoding,
        :delivery_mode,
        :priority,
        :correlation_id,
        :reply_to,
        :expiration,
        :message_id,
        :timestamp,
        :type,
        :user_id,
        :app_id,
        :cluster_id
      ].each do |properties_property|
        define_method(properties_property) { @properties.__send__(properties_property) }
      end # each
    end

    def headers
      deep_normalize_headers(@properties.headers)
    end

    def persistent?
      delivery_mode == 2
    end

    def redelivered?
      redeliver
    end

    def redelivery?
      redeliver
    end

    # Turns LongString instances into String
    private
    LONG_STRING_TYPE = com.rabbitmq.client.LongString
    def deep_normalize_headers(value)
      if value.is_a?(java.util.Map)
        new_map = {}
        value.each {|k,v| new_map[k] = deep_normalize_headers(v)}
        new_map
      elsif value.is_a?(java.util.List)
        value.map {|v| deep_normalize_headers(v)}
      else
        if value.java_kind_of?(LONG_STRING_TYPE)
          value.to_s
        else
          value
        end
      end
    end
  end # Headers


  class BasicPropertiesBuilder
    def self.build_properties_from(props = {})
      builder = AMQP::BasicProperties::Builder.new

      builder.content_type(props[:content_type]).
        content_encoding(props[:content_encoding]).
        headers(self.deep_stringify_keys(props[:headers])).
        delivery_mode(props[:persistent] ? 2 : 1).
        priority(props[:priority]).
        correlation_id(props[:correlation_id]).
        reply_to(props[:reply_to]).
        expiration(if props[:expiration] then props[:expiration].to_s end).
        message_id(props[:message_id]).
        timestamp(props[:timestamp]).
        type(props[:type]).
        user_id(props[:user_id]).
        app_id(props[:app_id]).
        cluster_id(props[:cluster_id]).
        build
    end

    # Deep hash transformation fn is courtesy of Avdi Grimm
    # and Markus Kuhnt, with some modifications to support primitive
    # and array values.
    def self.transform_hash(value, options = {}, &block)
      return nil if value.nil?
      return value if !value.is_a?(Hash) && !value.is_a?(Array)
      return value.map { |v| transform_hash(v, options, &block) } if value.is_a?(Array)

      value.inject({}) do |result, (key, value)|
        value = if (options[:deep] && value.is_a?(Hash))
                  transform_hash(value, options, &block)
                else
                  if value.is_a?(Array)
                    value.map { |v| transform_hash(v, options, &block) }
                  else
                    value
                  end
                end
        block.call(result, key, value)
        result
      end
    end

    def self.deep_stringify_keys(hash)
      transform_hash(hash, :deep => true) do |hash, key, value|
        hash[key.to_s] = value
      end
    end
  end
end # MarchHare
