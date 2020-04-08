# encoding: utf-8
require_relative '../plugin_mixins/rabbitmq_connection'
require 'logstash/inputs/threadable'
require 'logstash/event'
java_import java.util.concurrent.ArrayBlockingQueue
java_import java.util.concurrent.TimeUnit

module LogStash
  module Inputs
    # Pull events from a http://www.rabbitmq.com/[RabbitMQ] queue.
    #
    # The default settings will create an entirely transient queue and listen for all messages by default.
    # If you need durability or any other advanced settings, please set the appropriate options
    #
    # This plugin uses the http://rubymarchhare.info/[March Hare] library
    # for interacting with the RabbitMQ server. Most configuration options
    # map directly to standard RabbitMQ and AMQP concepts. The
    # https://www.rabbitmq.com/amqp-0-9-1-reference.html[AMQP 0-9-1 reference guide]
    # and other parts of the RabbitMQ documentation are useful for deeper
    # understanding.
    #
    # The properties of messages received will be stored in the
    # `[@metadata][rabbitmq_properties]` field if the `@metadata_enabled` setting is checked.
    # Note that storing metadata may degrade performance.
    # The following properties may be available (in most cases dependent on whether
    # they were set by the sender):
    #
    # * app-id
    # * cluster-id
    # * consumer-tag
    # * content-encoding
    # * content-type
    # * correlation-id
    # * delivery-mode
    # * exchange
    # * expiration
    # * message-id
    # * priority
    # * redeliver
    # * reply-to
    # * routing-key
    # * timestamp
    # * type
    # * user-id
    #
    # For example, to get the RabbitMQ message's timestamp property
    # into the Logstash event's `@timestamp` field, use the date
    # filter to parse the `[@metadata][rabbitmq_properties][timestamp]`
    # field:
    # [source,ruby]
    #     filter {
    #       if [@metadata][rabbitmq_properties][timestamp] {
    #         date {
    #           match => ["[@metadata][rabbitmq_properties][timestamp]", "UNIX"]
    #         }
    #       }
    #     }
    #
    # Additionally, any message headers will be saved in the
    # `[@metadata][rabbitmq_headers]` field.
    class RabbitMQ < LogStash::Inputs::Threadable
      include ::LogStash::PluginMixins::RabbitMQConnection

      # The properties to extract from each message and store in a
      # @metadata field.
      #
      # Technically the exchange, redeliver, and routing-key
      # properties belong to the envelope and not the message but we
      # ignore that distinction here. However, we extract the
      # headers separately via get_headers even though the header
      # table technically is a message property.
      #
      # Freezing all strings so that code modifying the event's
      # @metadata field can't touch them.
      #
      # If updating this list, remember to update the documentation
      # above too.
      MESSAGE_PROPERTIES = [
        "app-id",
        "cluster-id",
        "consumer-tag",
        "content-encoding",
        "content-type",
        "correlation-id",
        "delivery-mode",
        "exchange",
        "expiration",
        "message-id",
        "priority",
        "redeliver",
        "reply-to",
        "routing-key",
        "timestamp",
        "type",
        "user-id",
      ].map { |s| s.freeze }.freeze

      INTERNAL_QUEUE_POISON=[]

      config_name "rabbitmq"

      # The default codec for this plugin is JSON. You can override this to suit your particular needs however.
      default :codec, "json"

      # The name of the queue Logstash will consume events from. If
      # left empty, a transient queue with an randomly chosen name
      # will be created.
      config :queue, :validate => :string, :default => ""

      # Is this queue durable? (aka; Should it survive a broker restart?)
      config :durable, :validate => :boolean, :default => false

      # Should the queue be deleted on the broker when the last consumer
      # disconnects? Set this option to `false` if you want the queue to remain
      # on the broker, queueing up messages until a consumer comes along to
      # consume them.
      config :auto_delete, :validate => :boolean, :default => false

      # Is the queue exclusive? Exclusive queues can only be used by the connection
      # that declared them and will be deleted when it is closed (e.g. due to a Logstash
      # restart).
      config :exclusive, :validate => :boolean, :default => false

      config :arguments, :validate => :array, :default => {}

      # Prefetch count. If acknowledgements are enabled with the `ack`
      # option, specifies the number of outstanding unacknowledged
      # messages allowed.
      config :prefetch_count, :validate => :number, :default => 256

      # Enable message acknowledgements. With acknowledgements
      # messages fetched by Logstash but not yet sent into the
      # Logstash pipeline will be requeued by the server if Logstash
      # shuts down. Acknowledgements will however hurt the message
      # throughput.
      #
      # This will only send an ack back every `prefetch_count` messages.
      # Working in batches provides a performance boost here.
      config :ack, :validate => :boolean, :default => true

      # If true the queue will be passively declared, meaning it must
      # already exist on the server. To have Logstash create the queue
      # if necessary leave this option as false. If actively declaring
      # a queue that already exists, the queue options for this plugin
      # (durable etc) must match those of the existing queue.
      config :passive, :validate => :boolean, :default => false

      # The name of the exchange to bind the queue to. Specify `exchange_type`
      # as well to declare the exchange if it does not exist
      config :exchange, :validate => :string

      # The type of the exchange to bind to. Specifying this will cause this plugin
      # to declare the exchange if it does not exist.
      config :exchange_type, :validate => :string

      # The routing key to use when binding a queue to the exchange.
      # This is only relevant for direct or topic exchanges.
      #
      # * Routing keys are ignored on fanout exchanges.
      # * Wildcards are not valid on direct exchanges.
      config :key, :validate => :string, :default => "logstash"

      # Amount of time in seconds to wait after a failed subscription request
      # before retrying. Subscribes can fail if the server goes away and then comes back.
      config :subscription_retry_interval_seconds, :validate => :number, :required => true, :default => 5

      # Enable the storage of message headers and properties in `@metadata`. This may impact performance
      config :metadata_enabled, :validate => :boolean, :default => false

      def register
        @internal_queue = java.util.concurrent.ArrayBlockingQueue.new(@prefetch_count*2)
      end

      def run(output_queue)
        setup!
        @output_queue = output_queue
        consume!
      end

      def setup!
        connect!
        declare_queue!
        bind_exchange!
        @hare_info.channel.prefetch = @prefetch_count
      rescue => e
        @logger.warn("Error while setting up connection for rabbitmq input! Will retry.",
                     :message => e.message,
                     :class => e.class.name,
                     :location => e.backtrace.first)
        sleep_for_retry
        retry
      end

      def bind_exchange!
        if @exchange
          if @exchange_type # Only declare the exchange if @exchange_type is set!
            @logger.info? && @logger.info("Declaring exchange '#{@exchange}' with type #{@exchange_type}")
            @hare_info.exchange = declare_exchange!(@hare_info.channel, @exchange, @exchange_type, @durable)
          end
          @hare_info.queue.bind(@exchange, :routing_key => @key)
        end
      end

      def declare_queue!
        @hare_info.queue = declare_queue()
      end

      def declare_queue
        @hare_info.channel.queue(@queue,
                                 :durable     => @durable,
                                 :auto_delete => @auto_delete,
                                 :exclusive   => @exclusive,
                                 :passive     => @passive,
                                 :arguments   => @arguments)
      end

      def consume!
        @consumer = @hare_info.queue.build_consumer(:on_cancellation => Proc.new { on_cancellation }) do |metadata, data|
          @internal_queue.put [metadata, data]
        end

        begin
          @hare_info.queue.subscribe_with(@consumer, :manual_ack => @ack)
        rescue MarchHare::Exception => e
          @logger.warn("Could not subscribe to queue! Will retry in #{@subscription_retry_interval_seconds} seconds", :queue => @queue)

          sleep @subscription_retry_interval_seconds
          retry
        end

        internal_queue_consume!
      end

      def internal_queue_consume!
        i=0
        last_delivery_tag=nil
        while true
          payload = @internal_queue.poll(10, TimeUnit::MILLISECONDS)
          if !payload  # Nothing in the queue
            if last_delivery_tag # And we have unacked stuff
              @hare_info.channel.ack(last_delivery_tag, true) if @ack
              i=0
              last_delivery_tag = nil
            end
            next
          end

          break if payload == INTERNAL_QUEUE_POISON

          metadata, data = payload
          @codec.decode(data) do |event|
            decorate(event)
            if @metadata_enabled
              event.set("[@metadata][rabbitmq_headers]", get_headers(metadata))
              event.set("[@metadata][rabbitmq_properties]", get_properties(metadata))
            end
            @output_queue << event if event
          end

          i += 1

          if i >= @prefetch_count
            @hare_info.channel.ack(metadata.delivery_tag, true) if @ack
            i = 0
            last_delivery_tag = nil
          else
            last_delivery_tag = metadata.delivery_tag
          end
        end
      end

      def stop
        @internal_queue.put(INTERNAL_QUEUE_POISON)
        shutdown_consumer
        close_connection
      end

      def shutdown_consumer
        return unless @consumer
        @hare_info.channel.basic_cancel(@consumer.consumer_tag)
        until @consumer.terminated?
          @logger.info("Waiting for rabbitmq consumer to terminate before stopping!", :params => self.params)
          sleep 1
        end
      end

      def on_cancellation
        if !stop? # If this isn't already part of a regular stop
          @logger.info("Received basic.cancel from #{rabbitmq_settings[:host]}, shutting down.")
          stop
        end
      end

      private
      def get_headers(metadata)
	metadata.headers || {}
      end

      private
      def get_properties(metadata)
        MESSAGE_PROPERTIES.reduce({}) do |acc, name|
          # The method names obviously can't contain hyphens.
          value = metadata.send(name.gsub("-", "_"))
          if value
            # The AMQP 0.9.1 timestamp field only has second resolution
            # so storing milliseconds serves no purpose and might give
            # the incorrect impression of a higher resolution.
            acc[name] = name != "timestamp" ? value : value.getTime / 1000
          end
          acc
        end
      end
    end
  end
end
