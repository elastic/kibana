# encoding: utf-8

module MarchHare
  import com.rabbitmq.client.AMQP

  # Represents AMQP 0.9.1 exchanges.
  #
  # @see http://rubymarchhare.info/articles/exchanges.html Exchanges and Publishing guide
  # @see http://rubymarchhare.info/articles/extensions.html RabbitMQ Extensions guide
  # @see Queue#bind
  class Exchange
    # @return [String] Exchange name
    attr_reader :name
    # @return [MarchHare::Channel] Channel this exchange object uses
    attr_reader :channel

    # Type of this exchange (one of: :direct, :fanout, :topic, :headers).
    # @return [Symbol]
    attr_reader :type

    # Instantiates a new exchange.
    #
    # @param [Channel] channel Channel to declare exchange on
    # @params [String] name Exchange name
    # @params [Hash] options ({}) Exchange and declaration attributes
    #
    # @options opts :type [Symbol, String] Exchange type
    # @options opts :durable [Boolean] (false) Will the exchange be durable?
    # @options opts :auto_delete [Boolean] (false) Will the exchange be auto-deleted?
    # @options opts :passive [Boolean] (false) Should passive declaration be used?
    # @options opts :internal [Boolean] (false) Will the exchange be internal?
    #
    # @see MarchHare::Channel#default_exchange
    # @see MarchHare::Channel#fanout
    # @see MarchHare::Channel#topic
    # @see MarchHare::Channel#direct
    # @see MarchHare::Channel#headers
    # @see MarchHare::Channel#exchange
    def initialize(channel, name, options = {})
      raise ArgumentError, "exchange channel cannot be nil" if channel.nil?
      raise ArgumentError, "exchange name cannot be nil" if name.nil?
      raise ArgumentError, "exchange :type must be specified as an option" if options[:type].nil?

      @channel = channel
      @name    = name
      @type    = options[:type]
      @options = {:type => :fanout, :durable => false, :auto_delete => false, :internal => false, :passive => false}.merge(options)
    end

    # Publishes a message
    #
    # @param [String] payload Message payload. It will never be modified by MarchHare or RabbitMQ in any way.
    # @param [Hash] opts Message properties (metadata) and delivery settings
    #
    # @option opts [String] :routing_key Routing key
    # @option opts [Boolean] :persistent Should the message be persisted to disk?
    # @option opts [Boolean] :mandatory Should the message be returned if it cannot be routed to any queue?
    # @option opts [Hash] :properties Messages and delivery properties
    #
    #  * :timestamp (Time) A timestamp associated with this message
    #  * :expiration (Integer) Expiration time after which the message will be deleted
    #  * :type (String) Message type, e.g. what type of event or command this message represents. Can be any string
    #  * :reply_to (String) Queue name other apps should send the response to
    #  * :content_type (String) Message content type (e.g. application/json)
    #  * :content_encoding (String) Message content encoding (e.g. gzip)
    #  * :correlation_id (String) Message correlated to this one, e.g. what request this message is a reply for
    #  * :priority (Integer) Message priority, 0 to 9. Not used by RabbitMQ, only applications
    #  * :message_id (String) Any message identifier
    #  * :user_id (String) Optional user ID. Verified by RabbitMQ against the actual connection username
    #  * :app_id (String) Optional application ID
    #
    # @return [MarchHare::Exchange] Self
    # @see http://rubymarchhare.info/articles/exchanges.html Exchanges and Publishing guide
    # @api public
    def publish(body, opts = {})
      options = {:routing_key => '', :mandatory => false}.merge(opts)
      @channel.basic_publish(@name,
                             options.delete(:routing_key),
                             options.delete(:mandatory),
                             options.fetch(:properties, options),
                             body.to_java_bytes)
    end

    # Deletes the exchange unless it is predefined
    #
    # @param [Hash] options Options
    #
    # @option opts [Boolean] if_unused (false) Should this exchange be deleted only if it is no longer used
    #
    # @see http://rubymarchhare.info/articles/exchanges.html Exchanges and Publishing guide
    # @api public
    def delete(options={})
      @channel.deregister_exchange(self)
      @channel.exchange_delete(@name, options.fetch(:if_unused, false)) unless predefined?
    end

    # Binds an exchange to another (source) exchange using exchange.bind AMQP 0.9.1 extension
    # that RabbitMQ provides.
    #
    # @param [String] exchange Source exchange name
    # @param [Hash] options Options
    #
    # @option opts [String] routing_key (nil) Routing key used for binding
    # @option opts [Hash] arguments ({}) Optional arguments
    #
    # @return [MarchHare::Exchange] Self
    # @see http://rubymarchhare.info/articles/exchanges.html Exchanges and Publishing guide
    # @see http://rubymarchhare.info/articles/bindings.html Bindings guide
    # @see http://rubymarchhare.info/articles/extensions.html RabbitMQ Extensions guide
    # @api public
    def bind(exchange, options={})
      exchange_name = if exchange.respond_to?(:name) then exchange.name else exchange.to_s end
      @channel.exchange_bind(@name, exchange_name, options.fetch(:routing_key, ''))
    end

    # Unbinds an exchange from another (source) exchange using exchange.unbind AMQP 0.9.1 extension
    # that RabbitMQ provides.
    #
    # @param [String] source Source exchange name
    # @param [Hash] opts Options
    #
    # @option opts [String] routing_key (nil) Routing key used for binding
    # @option opts [Hash] arguments ({}) Optional arguments
    #
    # @return [Bunny::Exchange] Self
    # @see http://rubymarchhare.info/articles/exchanges.html Exchanges and Publishing guide
    # @see http://rubymarchhare.info/articles/bindings.html Bindings guide
    # @see http://rubymarchhare.info/articles/extensions.html RabbitMQ Extensions guide
    # @api public
    def unbind(exchange, opts = {})
      exchange_name = if exchange.respond_to?(:name) then exchange.name else exchange.to_s end
      @channel.exchange_unbind(@name, exchange_name, opts.fetch(:routing_key, ''), opts[:arguments])
    end

    # @return [Boolean] true if this exchange is a pre-defined one (amq.direct, amq.fanout, amq.match and so on)
    def predefined?
      @name.empty? || @name.start_with?("amq.")
    end

    # @return [Boolean] true if this exchange was declared as durable (will survive broker restart).
    # @api public
    def durable?
      !!@options[:durable]
    end # durable?

    # @return [Boolean] true if this exchange was declared as automatically deleted (deleted as soon as last consumer unbinds).
    # @api public
    def auto_delete?
      !!@options[:auto_delete]
    end # auto_delete?

    # @return [Boolean] true if this exchange is internal (used solely for exchange-to-exchange
    #                   bindings and cannot be published to by clients)
    def internal?
      !!@options[:internal]
    end

    # Waits until all outstanding publisher confirms on the channel
    # arrive.
    #
    # This is a convenience method that delegates to {Channel#wait_for_confirms}
    #
    # @api public
    def wait_for_confirms
      @channel.wait_for_confirms
    end


    #
    # Implementation
    #

    # @private
    def declare!
      unless predefined?
        if @options[:passive]
        then @channel.exchange_declare_passive(@name)
        else @channel.exchange_declare(@name, @options[:type].to_s,
            @options[:durable],
            @options[:auto_delete],
            @options[:internal],
            @options[:arguments])
        end
      end
    end

    # @private
    def recover_from_network_failure
      # puts "Recovering exchange #{@name} from network failure"
      unless predefined?
        begin
          declare!

          @channel.register_exchange(self)
        rescue Exception => e
          @channel.logger.error("Caught Exception while redeclaring and registering exchange #{@name}!")
          @channel.logger.error(e)
        end
      end
    end
  end
end
