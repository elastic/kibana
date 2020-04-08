# encoding: UTF-8
require "logstash/pipeline"
require_relative '../plugin_mixins/rabbitmq_connection'
java_import java.util.concurrent.TimeoutException
java_import com.rabbitmq.client.AlreadyClosedException

require 'back_pressure'

# Push events to a RabbitMQ exchange. Requires RabbitMQ 2.x
# or later version (3.x is recommended).
# 
# Relevant links:
#
# * http://www.rabbitmq.com/[RabbitMQ]
# * http://rubymarchhare.info[March Hare]
module LogStash
  module Outputs
    class RabbitMQ < LogStash::Outputs::Base
      include LogStash::PluginMixins::RabbitMQConnection

      config_name "rabbitmq"
      
      concurrency :shared

      # The default codec for this plugin is JSON. You can override this to suit your particular needs however.
      default :codec, "json"

      # Key to route to by default. Defaults to 'logstash'
      #
      # * Routing keys are ignored on fanout exchanges.
      config :key, :validate => :string, :default => "logstash"

      # The name of the exchange
      config :exchange, :validate => :string, :required => true

      # The exchange type (fanout, topic, direct)
      config :exchange_type, :validate => EXCHANGE_TYPES, :required => true

      # Is this exchange durable? (aka; Should it survive a broker restart?)
      config :durable, :validate => :boolean, :default => true

      # Should RabbitMQ persist messages to disk?
      config :persistent, :validate => :boolean, :default => true

      # Properties to be passed along with the message
      config :message_properties, :validate => :hash, :default => {}

      def register
        connect!
        @hare_info.exchange = declare_exchange!(@hare_info.channel, @exchange, @exchange_type, @durable)
        # The connection close should close all channels, so it is safe to store thread locals here without closing them
        @thread_local_channel = java.lang.ThreadLocal.new
        @thread_local_exchange = java.lang.ThreadLocal.new

        @gated_executor = back_pressure_provider_for_connection(@hare_info.connection)
      end

      def symbolize(myhash)
        Hash[myhash.map{|(k,v)| [k.to_sym,v]}]
      end

      def multi_receive_encoded(events_and_data)
        events_and_data.each do |event, data|
          publish(event, data)
        end
      end

      def publish(event, message)
        raise ArgumentError, "No exchange set in HareInfo!!!" unless @hare_info.exchange
        @gated_executor.execute do
          local_exchange.publish(message, :routing_key => event.sprintf(@key), :properties => symbolize(@message_properties.merge(:persistent => @persistent)))
        end
      rescue MarchHare::Exception, IOError, AlreadyClosedException, TimeoutException => e
        @logger.error("Error while publishing. Will retry.",
                      :message => e.message,
                      :exception => e.class,
                      :backtrace => e.backtrace)

        sleep_for_retry
        retry
      end

      def local_exchange
        exchange = @thread_local_exchange.get
        if !exchange
          exchange = declare_exchange!(local_channel, @exchange, @exchange_type, @durable)
          @thread_local_exchange.set(exchange)
        end
        exchange
      end

      def local_channel
        channel = @thread_local_channel.get
        if !channel
          channel = @hare_info.connection.create_channel
          @thread_local_channel.set(channel)
        end
        channel
      end

      def close
        close_connection
      end

      private

      # When the other end of a RabbitMQ connection is either unwilling or unable to continue reading bytes from
      # its underlying TCP stream, the connection is flagged as "blocked", but attempts to publish onto exchanges
      # using the connection will not block in the client.
      #
      # Here we hook into notifications of connection-blocked state to set up a `BackPressure::GatedExecutor`,
      # which is used elsewhere to prevent runaway writes when publishing to an exchange on a blocked connection.
      def back_pressure_provider_for_connection(march_hare_connection)
        BackPressure::GatedExecutor.new(description: "RabbitMQ[#{self.id}]", logger: logger).tap do |executor|
          march_hare_connection.on_blocked do |reason|
            executor.engage_back_pressure("connection flagged as blocked: `#{reason}`")
          end
          march_hare_connection.on_unblocked do
            executor.remove_back_pressure('connection flagged as unblocked')
          end
          march_hare_connection.on_recovery_start do
            executor.engage_back_pressure("connection is being recovered")
          end
          march_hare_connection.on_recovery do
            executor.remove_back_pressure('connection recovered')
          end
        end
      end
    end
  end
end