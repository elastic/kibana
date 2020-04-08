# encoding: utf-8
require "march_hare/shutdown_listener"
require "march_hare/juc"

module MarchHare
  # ## Channels in RabbitMQ
  #
  # To quote {http://www.rabbitmq.com/resources/specs/amqp0-9-1.pdf AMQP 0.9.1 specification}:
  #
  # AMQP 0.9.1 is a multi-channelled protocol. Channels provide a way to multiplex
  # a heavyweight TCP/IP connection into several light weight connections.
  # This makes the protocol more “firewall friendly” since port usage is predictable.
  # It also means that traffic shaping and other network QoS features can be easily employed.
  # Channels are independent of each other and can perform different functions simultaneously
  # with other channels, the available bandwidth being shared between the concurrent activities.
  #
  #
  # ## Opening Channels
  #
  # Channels can be opened either via `MarchHare::Session#create_channel` (sufficient in the majority
  # of cases) or by instantiating `MarchHare::Channel` directly:
  #
  # @example Using {MarchHare::Session#create_channel}:
  #   conn = MarchHare.new
  #   conn.start
  #
  #   ch   = conn.create_channel
  #
  # This will automatically allocate a channel id.
  #
  # ## Closing Channels
  #
  # Channels are closed via {MarchHare::Channel#close}. Channels that get a channel-level exception are
  # closed, too. Closed channels can no longer be used. Attempts to use them will raise
  # {MarchHare::ChannelAlreadyClosed}.
  #
  # @example
  #
  #   ch  = conn.create_channel
  #   ch.close
  #
  # ## Higher-level API
  #
  # MarchHare offers two sets of methods on {MarchHare::Channel}: known as higher-level and lower-level
  # APIs, respectively. Higher-level API mimics {http://rubyamqp.info amqp gem} API where
  # exchanges and queues are objects (instance of {MarchHare::Exchange} and {MarchHare::Queue}, respectively).
  # Lower-level API is built around AMQP 0.9.1 methods (commands), where queues and exchanges are
  # passed as strings (à la RabbitMQ Java client, {http://clojurerabbitmq.info Langohr} and Pika).
  #
  # ### Queue Operations In Higher-level API
  #
  # * {MarchHare::Channel#queue} is used to declare queues. The rest of the API is in {MarchHare::Queue}.
  #
  #
  # ### Exchange Operations In Higher-level API
  #
  # * {MarchHare::Channel#topic} declares a topic exchange. The rest of the API is in {MarchHare::Exchange}.
  # * {MarchHare::Channel#direct} declares a direct exchange.
  # * {MarchHare::Channel#fanout} declares a fanout exchange.
  # * {MarchHare::Channel#headers} declares a headers exchange.
  # * {MarchHare::Channel#default_exchange}
  # * {MarchHare::Channel#exchange} is used to declare exchanges with type specified as a symbol or string.
  #
  #
  # ## Channel Qos (Prefetch Level)
  #
  # It is possible to control how many messages at most a consumer will be given (before it acknowledges
  # or rejects previously consumed ones). This setting is per channel and controlled via {MarchHare::Channel#prefetch}.
  #
  #
  # ## Channel IDs
  #
  # Channels are identified by their ids which are integers. MarchHare takes care of allocating and
  # releasing them as channels are opened and closed. It is almost never necessary to specify
  # channel ids explicitly.
  #
  # There is a limit on the maximum number of channels per connection, usually 65536. Note
  # that allocating channels is very cheap on both client and server so having tens, hundreds
  # or even thousands of channels is possible.
  #
  # ## Channels and Error Handling
  #
  # Channel-level exceptions are more common than connection-level ones and often indicate
  # issues applications can recover from (such as consuming from or trying to delete
  # a queue that does not exist).
  #
  # With MarchHare, channel-level exceptions are raised as Ruby exceptions, for example,
  # {MarchHare::NotFound}, that provide access to the underlying `channel.close` method
  # information.
  #
  # @example Handling 404 NOT_FOUND
  #   begin
  #     ch.queue_delete("queue_that_should_not_exist#{rand}")
  #   rescue MarchHare::NotFound => e
  #     puts "Channel-level exception! Code: #{e.channel_close.reply_code}, message: #{e.channel_close.reply_text}"
  #   end
  #
  # @example Handling 406 PRECONDITION_FAILED
  #   begin
  #     ch2 = conn.create_channel
  #     q   = "rubymarchhare.examples.recovery.q#{rand}"
  #
  #     ch2.queue_declare(q, :durable => false)
  #     ch2.queue_declare(q, :durable => true)
  #   rescue MarchHare::PreconditionFailed => e
  #     puts "Channel-level exception! Code: #{e.channel_close.reply_code}, message: #{e.channel_close.reply_text}"
  #   ensure
  #     conn.create_channel.queue_delete(q)
  #   end
  #
  # @see MarchHare::Session#create_channel
  # @see http://www.rabbitmq.com/tutorials/amqp-concepts.html AMQP 0.9.1 Model Concepts Guide
  # @see http://rubymarchhare.info/articles/getting_started.html Getting Started with RabbitMQ Using MarchHare
  # @see http://rubymarchhare.info/articles/queues.html Queues and Consumers
  # @see http://rubymarchhare.info/articles/exchanges.html Exchanges and Publishing
  class Channel
    # @return [Array<MarchHare::Consumer>] Consumers on this channel
    attr_reader :consumers

    # @private
    def initialize(session, delegate)
      @connection = session
      @delegate   = delegate

      @exchanges      = JavaConcurrent::ConcurrentHashMap.new
      @queues         = JavaConcurrent::ConcurrentHashMap.new
      # we keep track of consumers in part to gracefully shut down their
      # executors when the channel is closed. This frees library users
      # from having to worry about this. MK.
      @consumers      = JavaConcurrent::ConcurrentHashMap.new
      @shutdown_hooks = Array.new
      @confirm_hooks  = Array.new
      @recoveries_counter = JavaConcurrent::AtomicInteger.new(0)

      on_shutdown do |ch, cause|
        ch.gracefully_shut_down_consumers
      end
    end

    # @return [MarchHare::Session] Connection this channel is on
    def session
      @connection
    end
    alias client session
    alias connection session

    # @return [::Logger] Logger instance from the connection
    def logger
      @connection.logger
    end

    # @return [Integer] Channel id
    def channel_number
      @delegate.channel_number
    end
    alias id channel_number
    alias number channel_number

    # @return [Boolean] true if the channel is open
    def open?
      @delegate.open?
    end

    # Closes the channel.
    #
    # Closed channels can no longer be used. Closed channel id is
    # returned back to the pool of available ids and may be used by
    # a different channel opened later.
    def close(code = 200, reason = "Goodbye")
      v = @delegate.close(code, reason)

      @consumers.each do |tag, consumer|
        consumer.gracefully_shut_down
      end

      @connection.unregister_channel(self)

      v
    end

    # Defines a shutdown event callback. Shutdown events are
    # broadcasted when a channel is closed, either explicitly
    # or forcefully, or due to a network/peer failure.
    def on_shutdown(&block)
      sh = ShutdownListener.new(self, &block)

      @shutdown_hooks << sh
      @delegate.add_shutdown_listener(sh)

      sh
    end

    # @private
    def automatically_recover(session, java_connection)
      logger.debug("channel: begin automatic connection recovery")

      jch = java_connection.create_channel(id)

      self.revive_with(jch)
      self.recover_shutdown_hooks

      self.recover_prefetch_setting
      self.recover_confirm_mode
      self.recover_confirm_hooks
      self.recover_tx_mode
      self.recover_exchanges
      # # this includes bindings recovery
      self.recover_queues
      self.recover_consumers
      self.increment_recoveries_counter
    end

    # @private
    def revive_with(java_ch)
      @delegate = java_ch
    end

    # @private
    def recover_shutdown_hooks
      @shutdown_hooks.each do |sh|
        @delegate.add_shutdown_listener(sh)
      end
    end

    # @private
    def recover_confirm_hooks
      @confirm_hooks.each do |ch|
        @delegate.add_confirm_listener(ch)
      end
    end

    # Recovers basic.qos setting. Used by the Automatic Network Failure
    # Recovery feature.
    #
    def recover_prefetch_setting
      basic_qos(@prefetch_count) if defined?(@prefetch_count) && @prefetch_count
    end

    # Recovers publisher confirms mode. Used by the Automatic Network Failure
    # Recovery feature.
    def recover_confirm_mode
      confirm_select if defined?(@confirm_mode) && @confirm_mode
    end

    # Recovers transaction mode. Used by the Automatic Network Failure
    # Recovery feature.
    def recover_tx_mode
      tx_select if defined?(@tx_mode) && @tx_mode
    end

    # Recovers exchanges. Used by the Automatic Network Failure
    # Recovery feature.
    #
    def recover_exchanges
      @exchanges.values.each do |x|
        begin
          logger.debug("channel: recover exchange #{x.name}")
          x.recover_from_network_failure
        rescue Exception => e
          logger.error("Caught exception when recovering exchange #{x.name}")
          logger.error(e)
        end
      end
    end

    # Recovers queues and bindings. Used by the Automatic Network Failure
    # Recovery feature.
    def recover_queues
      @queues.values.each do |q|
        begin
          logger.debug("channel: recover queue #{q.name}")
          q.recover_from_network_failure
        rescue Exception => e
          logger.error("Caught exception when recovering queue #{q.name}")
          logger.error(e)
        end
      end
    end

    # Recovers consumers. Used by the Automatic Network Failure
    # Recovery feature.
    def recover_consumers
      @consumers.values.each do |c|
        begin
          logger.debug("channel: recover consumer #{c.consumer_tag}")
          self.unregister_consumer(c.consumer_tag)
          c.recover_from_network_failure
        rescue Exception => e
          logger.error("Caught exception when recovering consumer #{c.consumer_tag}")
          logger.error(e)
        end
      end
    end

    # @private
    def increment_recoveries_counter
      @recoveries_counter.increment_and_get
    end

    attr_reader :recoveries_counter

    # @group Exchanges

    # Declares a headers exchange or looks it up in the cache of previously
    # declared exchanges.
    #
    # @param [String] name Exchange name
    # @param [Hash] opts Exchange parameters
    #
    # @option options [String,Symbol] :type (:direct) Exchange type, e.g. :fanout or "x-consistent-hash"
    # @option options [Boolean] :durable (false) Should the exchange be durable?
    # @option options [Boolean] :auto_delete (false) Should the exchange be automatically deleted when no longer in use?
    # @option options [Hash] :arguments ({}) Optional exchange arguments
    #
    # @return [MarchHare::Exchange] Exchange instance
    # @see http://rubymarchhare.info/articles/exchanges.html Exchanges and Publishing guide
    # @see http://rubymarchhare.info/articles/extensions.html RabbitMQ Extensions to AMQP 0.9.1 guide
    def exchange(name, options={})
      dx = Exchange.new(self, name, options).tap do |x|
        x.declare!
      end

      self.register_exchange(dx)
    end

    # Declares a fanout exchange or looks it up in the cache of previously
    # declared exchanges.
    #
    # @param [String] name Exchange name
    # @param [Hash] opts Exchange parameters
    #
    # @option opts [Boolean] :durable (false) Should the exchange be durable?
    # @option opts [Boolean] :auto_delete (false) Should the exchange be automatically deleted when no longer in use?
    # @option opts [Hash] :arguments ({}) Optional exchange arguments (used by RabbitMQ extensions)
    #
    # @return [MarchHare::Exchange] Exchange instance
    # @see http://rubymarchhare.info/articles/exchanges.html Exchanges and Publishing guide
    # @see http://rubymarchhare.info/articles/extensions.html RabbitMQ Extensions to AMQP 0.9.1 guide
    def fanout(name, opts = {})
      dx = Exchange.new(self, name, opts.merge(:type => "fanout")).tap do |x|
        x.declare!
      end

      self.register_exchange(dx)
    end

    # Declares a direct exchange or looks it up in the cache of previously
    # declared exchanges.
    #
    # @param [String] name Exchange name
    # @param [Hash] opts Exchange parameters
    #
    # @option opts [Boolean] :durable (false) Should the exchange be durable?
    # @option opts [Boolean] :auto_delete (false) Should the exchange be automatically deleted when no longer in use?
    # @option opts [Hash] :arguments ({}) Optional exchange arguments (used by RabbitMQ extensions)
    #
    # @return [MarchHare::Exchange] Exchange instance
    # @see http://rubymarchhare.info/articles/exchanges.html Exchanges and Publishing guide
    # @see http://rubymarchhare.info/articles/extensions.html RabbitMQ Extensions to AMQP 0.9.1 guide
    def direct(name, opts = {})
      dx = Exchange.new(self, name, opts.merge(:type => "direct")).tap do |x|
        x.declare!
      end

      self.register_exchange(dx)
    end

    # Declares a topic exchange or looks it up in the cache of previously
    # declared exchanges.
    #
    # @param [String] name Exchange name
    # @param [Hash] opts Exchange parameters
    #
    # @option opts [Boolean] :durable (false) Should the exchange be durable?
    # @option opts [Boolean] :auto_delete (false) Should the exchange be automatically deleted when no longer in use?
    # @option opts [Hash] :arguments ({}) Optional exchange arguments (used by RabbitMQ extensions)
    #
    # @return [MarchHare::Exchange] Exchange instance
    # @see http://rubymarchhare.info/articles/exchanges.html Exchanges and Publishing guide
    # @see http://rubymarchhare.info/articles/extensions.html RabbitMQ Extensions to AMQP 0.9.1 guide
    def topic(name, opts = {})
      dx = Exchange.new(self, name, opts.merge(:type => "topic")).tap do |x|
        x.declare!
      end

      self.register_exchange(dx)
    end

    # Declares a headers exchange or looks it up in the cache of previously
    # declared exchanges.
    #
    # @param [String] name Exchange name
    # @param [Hash] opts Exchange parameters
    #
    # @option opts [Boolean] :durable (false) Should the exchange be durable?
    # @option opts [Boolean] :auto_delete (false) Should the exchange be automatically deleted when no longer in use?
    # @option opts [Hash] :arguments ({}) Optional exchange arguments
    #
    # @return [MarchHare::Exchange] Exchange instance
    # @see http://rubymarchhare.info/articles/exchanges.html Exchanges and Publishing guide
    # @see http://rubymarchhare.info/articles/extensions.html RabbitMQ Extensions to AMQP 0.9.1 guide
    def headers(name, opts = {})
      dx = Exchange.new(self, name, opts.merge(:type => "headers")).tap do |x|
        x.declare!
      end

      self.register_exchange(dx)
    end

    # Provides access to the default exchange
    # @see http://rubymarchhare.info/articles/exchanges.html Exchanges and Publishing guide
    def default_exchange
      @default_exchange ||= self.exchange("", :durable => true, :auto_delete => false, :type => "direct")
    end

    # Declares a echange using echange.declare AMQP 0.9.1 method.
    #
    # @param [String] name Exchange name
    # @param [Boolean] durable (false)     Should information about this echange be persisted to disk so that it
    #                                            can survive broker restarts? Typically set to true for long-lived exchanges.
    # @param [Boolean] auto_delete (false) Should this echange be deleted when it is no longer used?
    # @param [Boolean] passive (false)   If true, exchange will be checked for existence. If it does not
    #                                          exist, {MarchHare::NotFound} will be raised.
    #
    # @return RabbitMQ response
    # @see http://rubymarchhare.info/articles/echanges.html Exchanges and Publishing guide
    def exchange_declare(name, type, durable = false, auto_delete = false, internal = false, arguments = nil)
      converting_rjc_exceptions_to_ruby do
        @delegate.exchange_declare(name, type, durable, auto_delete, internal, arguments)
      end
    end

    # Binds an exchange to another exchange using exchange.bind method (RabbitMQ extension)
    #
    # @param [String] desitnation Destination exchange name
    # @param [String] source Source exchange name
    #
    # @param [String] routing_key Routing key used for binding
    # @param [Hash] arguments (nil) Optional arguments
    #
    # @return RabbitMQ response
    # @see http://rubymarchhare.info/articles/extensions.html RabbitMQ extensions guide
    # @see http://rubymarchhare.info/articles/bindings.html Bindings guide
    def exchange_bind(destination, source, routing_key, arguments = nil)
      converting_rjc_exceptions_to_ruby do
        @delegate.exchange_bind(destination, source, routing_key, arguments)
      end
    end

    # Unbinds an exchange from another exchange using exchange.unbind method (RabbitMQ extension)
    #
    # @param [String] destination Destination exchange name
    # @param [String] source Source exchange name
    #
    # @param [String] routing_key Routing key used for binding
    # @param [Hash] arguments ({}) Optional arguments
    #
    # @return RabbitMQ response
    # @see http://rubymarchhare.info/articles/extensions.html RabbitMQ extensions guide
    # @see http://rubymarchhare.info/articles/bindings.html Bindings guide
    def exchange_unbind(destination, source, routing_key, arguments = nil)
      converting_rjc_exceptions_to_ruby do
        @delegate.exchange_unbind(destination, source, routing_key, arguments)
      end
    end

    # @endgroup


    # @group Queues

    # Declares a queue or looks it up in the per-channel cache.
    #
    # @param  [String] name  Queue name. Pass an empty string to declare a server-named queue (make RabbitMQ generate a unique name).
    # @param  [Hash]   options  Queue properties and other options
    #
    # @option options [Boolean] :durable (false) Should this queue be durable?
    # @option options [Boolean] :auto-delete (false) Should this queue be automatically deleted when the last consumer disconnects?
    # @option options [Boolean] :exclusive (false) Should this queue be exclusive (only can be used by this connection, removed when the connection is closed)?
    # @option options [Boolean] :arguments ({}) Additional optional arguments (typically used by RabbitMQ extensions and plugins)
    #
    # @return [MarchHare::Queue] Queue that was declared or looked up in the cache
    # @see http://rubymarchhare.info/articles/queues.html Queues and Consumers guide
    # @see http://rubymarchhare.info/articles/extensions.html RabbitMQ Extensions guide
    def queue(name, options={})
      dq = Queue.new(self, name, options).tap do |q|
        q.declare!
      end

      self.register_queue(dq)
    end

    # Declares a queue using queue.declare AMQP 0.9.1 method.
    #
    # @param [String] name Queue name
    #
    # @param [Boolean] durable (false)     Should information about this queue be persisted to disk so that it
    #                                      can survive broker restarts? Typically set to true for long-lived queues.
    # @param [Boolean] auto_delete (false) Should this queue be deleted when the last consumer is cancelled?
    # @param [Boolean] exclusive (false)   Should only this connection be able to use this queue?
    #                                      If true, the queue will be automatically deleted when this
    #                                      connection is closed
    # @param [Boolean] passive (false)     If true, queue will be checked for existence. If it does not
    #                                      exist, {MarchHare::NotFound} will be raised.
    #
    # @return RabbitMQ response
    # @see http://rubymarchhare.info/articles/queues.html Queues and Consumers guide
    def queue_declare(name, durable, exclusive, auto_delete, arguments = {})
      converting_rjc_exceptions_to_ruby do
        @delegate.queue_declare(name, durable, exclusive, auto_delete, arguments)
      end
    end

    # Checks if a queue exists using queue.declare AMQP 0.9.1 method.
    # If it does not, a channel exception will be raised.
    #
    # @param [String] name Queue name
    #
    # @see http://rubymarchhare.info/articles/queues.html Queues and Consumers guide
    def queue_declare_passive(name)
      converting_rjc_exceptions_to_ruby do
        @delegate.queue_declare_passive(name)
      end
    end

    # Deletes a queue using queue.delete AMQP 0.9.1 method
    #
    # @param [String] name Queue name
    #
    # @param [Boolean] if_empty (false) Should this queue be deleted only if it has no messages?
    # @param [Boolean] if_unused (false) Should this queue be deleted only if it has no consumers?
    #
    # @return RabbitMQ response
    # @see http://rubymarchhare.info/articles/queues.html Queues and Consumers guide
    def queue_delete(name, if_empty = false, if_unused = false)
      converting_rjc_exceptions_to_ruby do
        @delegate.queue_delete(name, if_empty, if_unused)
      end
    end

    # Binds a queue to an exchange using queue.bind AMQP 0.9.1 method
    #
    # @param [String] name Queue name
    # @param [String] exchange Exchange name
    #
    # @param [String] routing_key Routing key used for binding
    # @param [Hash] arguments (nil) Optional arguments
    #
    # @return RabbitMQ response
    # @see http://rubymarchhare.info/articles/queues.html Queues and Consumers guide
    # @see http://rubymarchhare.info/articles/bindings.html Bindings guide
    def queue_bind(queue, exchange, routing_key, arguments = nil)
      converting_rjc_exceptions_to_ruby do
        @delegate.queue_bind(queue, exchange, routing_key, arguments)
      end
    end

    # Unbinds a queue from an exchange using queue.unbind AMQP 0.9.1 method
    #
    # @param [String] name Queue name
    # @param [String] exchange Exchange name
    #
    # @param [String] routing_key Routing key used for binding
    # @param [Hash] arguments ({}) Optional arguments
    #
    # @return RabbitMQ response
    # @see http://rubymarchhare.info/articles/queues.html Queues and Consumers guide
    # @see http://rubymarchhare.info/articles/bindings.html Bindings guide
    def queue_unbind(queue, exchange, routing_key, arguments = nil)
      converting_rjc_exceptions_to_ruby do
        @delegate.queue_unbind(queue, exchange, routing_key, arguments)
      end
    end

    # Purges a queue (removes all messages from it) using queue.purge AMQP 0.9.1 method.
    #
    # @param [String] name Queue name
    #
    # @return RabbitMQ response
    # @see http://rubymarchhare.info/articles/queues.html Queues and Consumers guide
    def queue_purge(name)
      converting_rjc_exceptions_to_ruby do
        @delegate.queue_purge(name)
      end
    end

    # @endgroup


    # @group basic.*

    # Publishes a message using basic.publish AMQP 0.9.1 method.
    #
    # @param [String] exchange Exchange to publish to
    # @param [String] routing_key Routing key
    # @param [String] body Message payload. It will never be modified by MarchHare or RabbitMQ in any way.
    # @option opts [Boolean] :mandatory Should the message be returned if it cannot be routed to any queue?
    #
    # @param [Hash] properties Message properties
    #
    # @option properties [Boolean] :persistent Should the message be persisted to disk?
    # @option properties [Integer] :timestamp A timestamp associated with this message
    # @option properties [Integer] :expiration Expiration time after which the message will be deleted
    # @option properties [String] :type Message type, e.g. what type of event or command this message represents. Can be any string
    # @option properties [String] :reply_to Queue name other apps should send the response to
    # @option properties [String] :content_type Message content type (e.g. application/json)
    # @option properties [String] :content_encoding Message content encoding (e.g. gzip)
    # @option properties [String] :correlation_id Message correlated to this one, e.g. what request this message is a reply for
    # @option properties [Integer] :priority Message priority, 0 to 9. Not used by RabbitMQ, only applications
    # @option properties [String] :message_id Any message identifier
    # @option properties [String] :user_id Optional user ID. Verified by RabbitMQ against the actual connection username
    # @option properties [String] :app_id Optional application ID
    #
    # @return [MarchHare::Channel] Self
    def basic_publish(exchange, routing_key, mandatory, properties, body)
      converting_rjc_exceptions_to_ruby do
        @delegate.basic_publish(exchange, routing_key, mandatory, false, BasicPropertiesBuilder.build_properties_from(properties || Hash.new), body)
      end
    end

    def basic_get(queue, auto_ack)
      converting_rjc_exceptions_to_ruby do
        @delegate.basic_get(queue, auto_ack)
      end
    end

    def basic_consume(queue, auto_ack, consumer_tag = nil, consumer)
      consumer.auto_ack = auto_ack
      tag = converting_rjc_exceptions_to_ruby do
        if consumer_tag
          @delegate.basic_consume(queue, auto_ack, consumer_tag, consumer)
        else
          @delegate.basic_consume(queue, auto_ack, consumer)
        end
      end
      self.register_consumer(tag, consumer)

      tag
    end

    def basic_qos(prefetch_count)
      r = converting_rjc_exceptions_to_ruby do
        @delegate.basic_qos(prefetch_count)
      end
      @prefetch_count = prefetch_count

      r
    end

    def qos(options={})
      basic_qos(options.fetch(:prefetch_count, 0))
    end

    # Sets how many messages will be given to consumers on this channel before they
    # have to acknowledge or reject one of the previously consumed messages
    #
    # @param [Integer] prefetch_count Prefetch (QoS setting) for this channel
    # @see http://rubymarchhare.info/articles/exchanges.html Exchanges and Publishing guide
    # @see http://rubymarchhare.info/articles/queues.html Queues and Consumers guide
    def prefetch=(n)
      basic_qos(n)
    end

    # @return [Integer] Active basic.qos prefetch setting.
    def prefetch
      @prefetch_count || 0
    end

    # Acknowledges a message. Acknowledged messages are completely removed from the queue.
    #
    # @param [Integer] delivery_tag Delivery tag to acknowledge
    # @param [Boolean] multiple (false) Should all unacknowledged messages up to this be acknowledged as well?
    # @see #nack
    # @see http://rubymarchhare.info/articles/queues.html Queues and Consumers guide
    def ack(delivery_tag, multiple = false)
      guarding_against_stale_delivery_tags(delivery_tag) do
        basic_ack(delivery_tag.to_i, multiple)
      end
    end
    alias acknowledge ack

    # Rejects a message. A rejected message can be requeued or
    # dropped by RabbitMQ.
    #
    # @param [Integer] delivery_tag Delivery tag to reject
    # @param [Boolean] requeue      Should this message be requeued instead of dropping it?
    # @see #ack
    # @see #nack
    # @see http://rubymarchhare.info/articles/queues.html Queues and Consumers guide
    def reject(delivery_tag, requeue = false)
      guarding_against_stale_delivery_tags(delivery_tag) do
        basic_reject(delivery_tag.to_i, requeue)
      end
    end

    # Rejects a message. A rejected message can be requeued or
    # dropped by RabbitMQ. This method is similar to {MarchHare::Channel#reject} but
    # supports rejecting multiple messages at once, and is usually preferred.
    #
    # @param [Integer] delivery_tag Delivery tag to reject
    # @param [Boolean] multiple (false) Should all unacknowledged messages up to this be rejected as well?
    # @param [Boolean] requeue  (false) Should this message be requeued instead of dropping it?
    # @see #ack
    # @see http://rubymarchhare.info/articles/queues.html Queues and Consumers guide
    def nack(delivery_tag, multiple = false, requeue = false)
      guarding_against_stale_delivery_tags(delivery_tag) do
        basic_nack(delivery_tag.to_i, multiple, requeue)
      end
    end

    # Rejects or requeues a message.
    #
    # @param [Integer] delivery_tag Delivery tag obtained from delivery info
    # @param [Boolean] requeue Should the message be requeued?
    # @return [NilClass] nil
    #
    # @example Requeue a message
    #   conn  = MarchHare.new
    #   conn.start
    #
    #   ch    = conn.create_channel
    #   q.subscribe do |delivery_info, properties, payload|
    #     # requeue the message
    #     ch.basic_reject(delivery_info.delivery_tag, true)
    #   end
    #
    # @example Reject a message
    #   conn  = MarchHare.new
    #   conn.start
    #
    #   ch    = conn.create_channel
    #   q.subscribe do |delivery_info, properties, payload|
    #     # requeue the message
    #     ch.basic_reject(delivery_info.delivery_tag, false)
    #   end
    #
    # @example Requeue a message fetched via basic.get
    #   conn  = MarchHare.new
    #   conn.start
    #
    #   ch    = conn.create_channel
    #   # we assume the queue exists and has messages
    #   delivery_info, properties, payload = ch.basic_get("bunny.examples.queue3", :ack => true)
    #   ch.basic_reject(delivery_info.delivery_tag, true)
    #
    # @see #basic_nack
    # @see http://rubymarchhare.info/articles/queues.html Queues and Consumers guide
    def basic_reject(delivery_tag, requeue)
      converting_rjc_exceptions_to_ruby do
        @delegate.basic_reject(delivery_tag.to_i, requeue)
      end
    end

    # Acknowledges one or more messages (deliveries).
    #
    # @param [Integer] delivery_tag Delivery tag obtained from delivery info
    # @param [Boolean] multiple Should all deliveries up to this one be acknowledged?
    # @return [NilClass] nil
    #
    # @see http://rubymarchhare.info/articles/queues.html Queues and Consumers guide
    def basic_ack(delivery_tag, multiple)
      converting_rjc_exceptions_to_ruby do
        @delegate.basic_ack(delivery_tag.to_i, multiple)
      end
    end

    # Rejects or requeues messages just like {MarchHare::Channel#basic_reject} but can do so
    # with multiple messages at once.
    #
    # @param [Integer] delivery_tag Delivery tag obtained from delivery info
    # @param [Boolean] requeue Should the message be requeued?
    # @param [Boolean] multiple Should all deliveries up to this one be rejected/requeued?
    # @return [NilClass] nil
    #
    # @see http://rubymarchhare.info/articles/queues.html Queues and Consumers guide
    # @see http://rubymarchhare.info/articles/extensions.html RabbitMQ Extensions guide
    def basic_nack(delivery_tag, multiple = false, requeue = false)
      converting_rjc_exceptions_to_ruby do
        @delegate.basic_nack(delivery_tag.to_i, multiple, requeue)
      end
    end

    # Redeliver unacknowledged messages
    #
    # @param [Boolean] requeue Should messages be requeued?
    # @return RabbitMQ response
    def basic_recover(requeue = true)
      converting_rjc_exceptions_to_ruby do
        @delegate.basic_recover(requeue)
      end
    end

    # Redeliver unacknowledged messages
    #
    # @param [Boolean] requeue Should messages be requeued?
    # @return RabbitMQ response
    def basic_recover_async(requeue = true)
      converting_rjc_exceptions_to_ruby do
        @delegate.basic_recover_async(requeue)
      end
    end

    # @endgroup

    # Enables publisher confirms on the channel.
    # @return [NilClass] nil
    #
    # @see http://rubymarchhare.info/articles/exchanges.html Exchanges and Publishers guide
    # @see http://rubymarchhare.info/articles/extensions.html RabbitMQ Extensions guide
    def confirm_select
      converting_rjc_exceptions_to_ruby do
        @confirm_mode = true
        @delegate.confirm_select
      end
    end

    # @return [Boolean] true if publisher confirms are enabled for this channel
    def using_publisher_confirms?
      !!@confirm_mode
    end
    alias uses_publisher_confirms? using_publisher_confirms?

    # Waits until all outstanding publisher confirms arrive.
    #
    # Takes an optional timeout in milliseconds. Will raise
    # an exception in case a timeout has occured.
    #
    # @param [Integer] timeout Timeout in milliseconds
    # @return [Boolean] true if all confirms were positive,
    #                        false if some were negative
    def wait_for_confirms(timeout = nil)
      if timeout
        converting_rjc_exceptions_to_ruby do
          @delegate.wait_for_confirms(timeout)
        end
      else
        @delegate.wait_for_confirms
      end
    end

    def next_publisher_seq_no
      @delegate.next_publisher_seq_no
    end

    # Enables transactions on the channel
    def tx_select
      converting_rjc_exceptions_to_ruby do
        @tx_mode = true
        @delegate.tx_select
      end
    end

    # @return [Boolean] true if transactions are enabled for this channel
    def using_tx?
      !!@tx_mode
    end
    alias uses_tx? using_tx?

    # Commits a transaction
    def tx_commit
      converting_rjc_exceptions_to_ruby do
        @delegate.tx_commit
      end
    end

    # Rolls back a transaction
    def tx_rollback
      converting_rjc_exceptions_to_ruby do
        @delegate.tx_rollback
      end
    end

    # Defines a returned message handler.
    # @see http://rubymarchhare.info/articles/exchanges.html Exchanges and Publishers guide
    def on_return(&block)
      self.add_return_listener(BlockReturnListener.from(block))
    end

    # Defines a publisher confirm handler
    # @see http://rubymarchhare.info/articles/exchanges.html Exchanges and Publishers guide
    def on_confirm(&block)
      ch = BlockConfirmListener.from(block)
      self.add_confirm_listener(ch)
      @confirm_hooks << ch
    end

    def method_missing(selector, *args)
      @delegate.__send__(selector, *args)
    end


    #
    # Implementation
    #

    # @private
    class BlockConfirmListener
      include com.rabbitmq.client.ConfirmListener

      def self.from(block)
        new(block)
      end

      def initialize(block)
        @block = block
      end

      def handleAck(delivery_tag, multiple)
        @block.call(:ack, delivery_tag, multiple)
      end

      def handleNack(delivery_tag, multiple)
        @block.call(:nack, delivery_tag, multiple)
      end
    end

    # @private
    class BlockReturnListener
      include com.rabbitmq.client.ReturnListener

      def self.from(block)
        new(block)
      end

      def initialize(block)
        @block = block
      end

      def handleReturn(reply_code, reply_text, exchange, routing_key, basic_properties, payload)
        # TODO: convert properties to a Ruby hash
        @block.call(reply_code, reply_text, exchange, routing_key, basic_properties, String.from_java_bytes(payload))
      end
    end

    # @private
    def deregister_queue(queue)
      logger.debug("channel: deregister queue #{queue.name}")
      @queues.delete(queue.name)
    end

    # @private
    def deregister_queue_named(name)
      @queues.delete(name)
    end

    # @private
    def register_queue(queue)
      logger.debug("channel: register queue #{queue.name}")
      @queues[queue.name] = queue
    end

    # @private
    def find_queue(name)
      @queues[name]
    end

    # @private
    def deregister_exchange(exchange)
      logger.debug("channel: deregister exchange #{exchange.name}")
      @exchanges.delete(exchange.name)
    end

    # @private
    def register_exchange(exchange)
      logger.debug("channel: register exchange #{exchange.name}")
      @exchanges[exchange.name] = exchange
    end

    # @private
    def register_consumer(consumer_tag, consumer)
      logger.debug("channel: register consumer #{consumer_tag}")
      @consumers[consumer_tag] = consumer
    end

    # @private
    def unregister_consumer(consumer_tag)
      logger.debug("channel: unregister consumer #{consumer_tag}")
      @consumers.delete(consumer_tag)
    end

    # @private
    def gracefully_shut_down_consumers
      @consumers.each do |tag, consumer|
        consumer.gracefully_shut_down
      end
    end

    # Executes a block, catching Java exceptions RabbitMQ Java client throws and
    # transforms them to Ruby exceptions that are then re-raised.
    #
    # @private
    def converting_rjc_exceptions_to_ruby(&block)
      begin
        block.call
      rescue Exception, java.lang.Throwable => e
        Exceptions.convert_and_reraise(e)
      end
    end

    # @private
    def guarding_against_stale_delivery_tags(tag, &block)
      case tag
      # if a fixnum was passed, execute unconditionally. MK.
      when Integer then
        block.call
        # versioned delivery tags should be checked to avoid
        # sending out stale (invalid) tags after channel was reopened
        # during network failure recovery. MK.
      when VersionedDeliveryTag then
        if !tag.stale?(@recoveries_counter.get)
          block.call
        end
      end
    end
  end
end
