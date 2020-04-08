require "march_hare/versioned_delivery_tag"

module MarchHare
  import com.rabbitmq.client.DefaultConsumer

  class BaseConsumer < DefaultConsumer
    attr_accessor :consumer_tag
    attr_accessor :auto_ack

    def initialize(channel, queue, opts)
      super(channel)
      @channel    = channel
      @queue      = queue
      @opts       = opts
      @auto_ack   = true

      @cancelling = JavaConcurrent::AtomicBoolean.new
      @cancelled  = JavaConcurrent::AtomicBoolean.new

      @terminated = JavaConcurrent::AtomicBoolean.new
    end

    def handleDelivery(consumer_tag, envelope, properties, bytes)
      body    = String.from_java_bytes(bytes)
      headers = Headers.new(channel, consumer_tag, envelope, properties)

      deliver(headers, body)
    end

    def handleCancel(consumer_tag)
      @cancelled.set(true)
      @channel.unregister_consumer(consumer_tag)

      if f = @opts[:on_cancellation]
        case f.arity
        when 0 then
          f.call
        when 1 then
          f.call(self)
        when 2 then
          f.call(@channel, self)
        when 3 then
          f.call(@channel, self, consumer_tag)
        else
          f.call(@channel, self, consumer_tag)
        end
      end

      @terminated.set(true)
    end

    def handleCancelOk(consumer_tag)
      @cancelled.set(true)
      @channel.unregister_consumer(consumer_tag)

      @terminated.set(true)
    end

    def start
      # no-op
    end

    def gracefully_shut_down
      # no-op
    end

    def deliver(headers, message)
      raise NotImplementedError, 'To be implemented by a subclass'
    end

    def cancelled?
      @cancelling.get || @cancelled.get
    end

    def active?
      !terminated?
    end

    def terminated?
      @terminated.get
    end

    # @private
    def recover_from_network_failure
      @terminated.set(false)
      @cancelled.set(false)
      @consumer_tag = @channel.basic_consume(@queue.name, @auto_ack, @consumer_tag, self)

      @consumer_tag
    end
  end

  class CallbackConsumer < BaseConsumer
    def initialize(channel, queue, opts, callback)
      raise ArgumentError, "callback must not be nil!" if callback.nil?

      super(channel, queue, opts)
      @callback = callback
      @callback_arity = @callback.arity
    end

    def deliver(headers, message)
      if @callback_arity == 2 or @callback_arity < 0
        @callback.call(headers, message)
      else
        @callback.call(message)
      end
    end

    def cancel
      if @cancelling.get_and_set(true)
        false
      else
        @channel.basic_cancel(@consumer_tag)
        @cancelled.set(true)
        @terminated.set(true)
        true
      end
    end
  end
end
