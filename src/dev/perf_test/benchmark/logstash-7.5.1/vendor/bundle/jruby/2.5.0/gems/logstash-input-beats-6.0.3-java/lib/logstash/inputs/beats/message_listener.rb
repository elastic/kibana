# encoding: utf-8
require "thread_safe"
require "logstash-input-beats_jars"
import "javax.net.ssl.SSLPeerUnverifiedException"
import "org.logstash.beats.MessageListener"

module LogStash module Inputs class Beats
  class MessageListener
    include org.logstash.beats.IMessageListener

    FILEBEAT_LOG_LINE_FIELD = "message".freeze
    LSF_LOG_LINE_FIELD = "line".freeze

    ConnectionState = Struct.new(:ctx, :codec, :ip_address)

    attr_reader :logger, :input, :connections_list

    def initialize(queue, input)
      @connections_list = ThreadSafe::Hash.new
      @queue = queue
      @logger = input.logger
      @input = input
      @metric = @input.metric
      @peak_connection_count = Concurrent::AtomicFixnum.new(0)

      @nocodec_transformer = RawEventTransform.new(@input)
      @codec_transformer = DecodedEventTransform.new(@input)
    end

    def onNewMessage(ctx, message)
      hash = message.getData
      ip_address = ip_address(ctx)

      hash['@metadata']['ip_address'] = ip_address unless ip_address.nil? || hash['@metadata'].nil?
      target_field = extract_target_field(hash)

      extract_tls_peer(hash, ctx)

      if target_field.nil?
        event = LogStash::Event.new(hash)
        @nocodec_transformer.transform(event)
        @queue << event
      else
        codec(ctx).accept(CodecCallbackListener.new(target_field,
                                                    hash,
                                                    message.getIdentityStream(),
                                                    @codec_transformer,
                                                    @queue))
      end
    end

    def onNewConnection(ctx)
      register_connection(ctx)
      increment_connection_count()
    end

    def onConnectionClose(ctx)
      unregister_connection(ctx)
      decrement_connection_count()
    end

    def onChannelInitializeException(ctx, cause)
      # This is mostly due to a bad certificate or keys, running Logstash in debug mode will show more information
      if cause.is_a?(Java::JavaLang::IllegalArgumentException)
        if input.logger.debug?
          input.logger.error("Looks like you either have a bad certificate, an invalid key or your private key was not in PKCS8 format.", :exception => cause)
        else
          input.logger.error("Looks like you either have a bad certificate, an invalid key or your private key was not in PKCS8 format.")
        end
      else
        input.logger.warn("Error when creating a connection", :exception => cause.to_s)
      end
    end

    def onException(ctx, cause)
      unregister_connection(ctx) unless connections_list[ctx].nil?
    end

    private
    def codec(ctx)
      return if connections_list[ctx].nil?
      connections_list[ctx].codec
    end

    def ip_address(ctx)
      return if connections_list[ctx].nil?
      connections_list[ctx].ip_address
    end

    def register_connection(ctx)
      connections_list[ctx] = ConnectionState.new(ctx, input.codec.clone, ip_address_from_ctx(ctx))
    end

    def ip_address_from_ctx(ctx)
      begin
        remote_address = ctx.channel.remoteAddress
        # Netty allows remoteAddress to be nil, which can cause a lot of log entries - see
        # https://github.com/logstash-plugins/logstash-input-beats/issues/269
        if remote_address.nil?
          input.logger.debug("Cannot retrieve remote IP address for beats input - remoteAddress is nil")
          return nil
        end
        remote_address.getAddress.getHostAddress
      rescue => e # This should not happen, but should not block the beats input
        input.logger.warn("Could not retrieve remote IP address for beats input.", :error => e)
        nil
      end
    end

    def unregister_connection(ctx)
      flush_buffer(ctx)
      connections_list.delete(ctx)
    end

    def flush_buffer(ctx)
      return if codec(ctx).nil?

      transformer = EventTransformCommon.new(@input)
      codec(ctx).flush do |event|
        transformer.transform(event)
        @queue << event
      end
    end

    def extract_tls_peer(hash, ctx)
      if @input.client_authentication_metadata?
        tls_session = ctx.channel().pipeline().get("ssl-handler").engine().getSession()
        tls_verified = true

        if not @input.client_authentication_required?
          # throws SSLPeerUnverifiedException if unverified
          begin
            tls_session.getPeerCertificates()
          rescue SSLPeerUnverifiedException => e
            tls_verified = false
            if input.logger.debug?
              input.logger.debug("SSL peer unverified. This is normal with 'peer' verification and client does not presents a certificate.", :exception => e)
            end
          end
        end

        if tls_verified
          hash['@metadata']['tls_peer'] = {
            :status       => "verified",
            :protocol     => tls_session.getProtocol(),
            :subject      => tls_session.getPeerPrincipal().getName(),
            :cipher_suite => tls_session.getCipherSuite()
          }
        else
          hash['@metadata']['tls_peer'] = {
            :status     => "unverified"
          }
        end
      end
    end

    def extract_target_field(hash)
      if from_filebeat?(hash)
        hash.delete(FILEBEAT_LOG_LINE_FIELD).to_s
      elsif from_logstash_forwarder?(hash)
        hash.delete(LSF_LOG_LINE_FIELD).to_s
      end
    end

    def from_filebeat?(hash)
      !hash[FILEBEAT_LOG_LINE_FIELD].nil?
    end

    def from_logstash_forwarder?(hash)
      !hash[LSF_LOG_LINE_FIELD].nil?
    end

    def increment_connection_count
      current_connection_count = @connections_list.size
      @metric.gauge(:current_connections, current_connection_count)
      if current_connection_count > @peak_connection_count.value
        @peak_connection_count.value = current_connection_count
        @metric.gauge(:peak_connections, @peak_connection_count.value)
      end
    end

    def decrement_connection_count
      @metric.gauge(:current_connections, @connections_list.size)
    end
  end
end; end; end
