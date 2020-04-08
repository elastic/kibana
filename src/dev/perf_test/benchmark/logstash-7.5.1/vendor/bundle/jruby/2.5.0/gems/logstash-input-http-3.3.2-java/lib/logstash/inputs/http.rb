# encoding: utf-8
require "logstash/inputs/base"
require "logstash/namespace"
require "stud/interval"
require "logstash-input-http_jars"

java_import "io.netty.handler.codec.http.HttpUtil"

# Using this input you can receive single or multiline events over http(s).
# Applications can send a HTTP POST request with a body to the endpoint started by this
# input and Logstash will convert it into an event for subsequent processing. Users 
# can pass plain text, JSON, or any formatted data and use a corresponding codec with this
# input. For Content-Type `application/json` the `json` codec is used, but for all other
# data formats, `plain` codec is used.
#
# This input can also be used to receive webhook requests to integrate with other services
# and applications. By taking advantage of the vast plugin ecosystem available in Logstash
# you can trigger actionable events right from your application.
# 
# ==== Security
# This plugin supports standard HTTP basic authentication headers to identify the requester.
# You can pass in an username, password combination while sending data to this input
#
# You can also setup SSL and send data securely over https, with an option of validating 
# the client's certificate. Currently, the certificate setup is through 
# https://docs.oracle.com/cd/E19509-01/820-3503/ggfen/index.html[Java Keystore 
# format]
#
class LogStash::Inputs::Http < LogStash::Inputs::Base
  require "logstash/inputs/http/tls"

  config_name "http"

  # Codec used to decode the incoming data.
  # This codec will be used as a fall-back if the content-type
  # is not found in the "additional_codecs" hash
  default :codec, "plain"

  # The host or ip to bind
  config :host, :validate => :string, :default => "0.0.0.0"

  # The TCP port to bind to
  config :port, :validate => :number, :default => 8080

  # Username for basic authorization
  config :user, :validate => :string, :required => false

  # Password for basic authorization
  config :password, :validate => :password, :required => false

  # Events are by default sent in plain text. You can
  # enable encryption by setting `ssl` to true and configuring
  # the `ssl_certificate` and `ssl_key` options.
  config :ssl, :validate => :boolean, :default => false

  # SSL certificate to use.
  config :ssl_certificate, :validate => :path

  # SSL key to use.
  # NOTE: This key need to be in the PKCS8 format, you can convert it with https://www.openssl.org/docs/man1.1.0/apps/pkcs8.html[OpenSSL]
  # for more information.
  config :ssl_key, :validate => :path

  # SSL key passphrase to use.
  config :ssl_key_passphrase, :validate => :password

  # Validate client certificates against these authorities.
  # You can define multiple files or paths. All the certificates will
  # be read and added to the trust store. You need to configure the `ssl_verify_mode`
  # to `peer` or `force_peer` to enable the verification.
  config :ssl_certificate_authorities, :validate => :array, :default => []

  # By default the server doesn't do any client verification.
  #
  # `peer` will make the server ask the client to provide a certificate.
  # If the client provides a certificate, it will be validated.
  #
  # `force_peer` will make the server ask the client to provide a certificate.
  # If the client doesn't provide a certificate, the connection will be closed.
  #
  # This option needs to be used with `ssl_certificate_authorities` and a defined list of CAs.
  config :ssl_verify_mode, :validate => ["none", "peer", "force_peer"], :default => "none"

  # Time in milliseconds for an incomplete ssl handshake to timeout
  config :ssl_handshake_timeout, :validate => :number, :default => 10000

  # The minimum TLS version allowed for the encrypted connections. The value must be one of the following:
  # 1.0 for TLS 1.0, 1.1 for TLS 1.1, 1.2 for TLS 1.2
  config :tls_min_version, :validate => :number, :default => TLS.min.version

  # The maximum TLS version allowed for the encrypted connections. The value must be the one of the following:
  # 1.0 for TLS 1.0, 1.1 for TLS 1.1, 1.2 for TLS 1.2
  config :tls_max_version, :validate => :number, :default => TLS.max.version

  # The list of ciphers suite to use, listed by priorities.
  config :cipher_suites, :validate => :array, :default => org.logstash.plugins.inputs.http.util.SslSimpleBuilder::DEFAULT_CIPHERS

  # Apply specific codecs for specific content types.
  # The default codec will be applied only after this list is checked
  # and no codec for the request's content-type is found
  config :additional_codecs, :validate => :hash, :default => { "application/json" => "json" }

  # specify a custom set of response headers
  config :response_headers, :validate => :hash, :default => { 'Content-Type' => 'text/plain' }

  # target field for the client host of the http request
  config :remote_host_target_field, :validate => :string, :default => "host"

  # target field for the client host of the http request
  config :request_headers_target_field, :validate => :string, :default => "headers"

  config :threads, :validate => :number, :required => false, :default => ::LogStash::Config::CpuCoreStrategy.maximum

  config :max_pending_requests, :validate => :number, :required => false, :default => 200

  config :max_content_length, :validate => :number, :required => false, :default => 100 * 1024 * 1024

  config :response_code, :validate => [200, 201, 202, 204], :default => 200
  # Deprecated options

  # The JKS keystore to validate the client's certificates
  config :keystore, :validate => :path, :deprecated => "Set 'ssl_certificate' and 'ssl_key' instead."
  config :keystore_password, :validate => :password, :deprecated => "Set 'ssl_key_passphrase' instead."

  config :verify_mode, :validate => ['none', 'peer', 'force_peer'], :default => 'none',
     :deprecated => "Set 'ssl_verify_mode' instead."

  public
  def register

    validate_ssl_settings!

    if @user && @password then
      token = Base64.strict_encode64("#{@user}:#{@password.value}")
      @auth_token = "Basic #{token}"
    end

    @codecs = Hash.new

    @additional_codecs.each do |content_type, codec|
      @codecs[content_type] = LogStash::Plugin.lookup("codec", codec).new
    end

    require "logstash/inputs/http/message_handler"
    message_handler = MessageHandler.new(self, @codec, @codecs, @auth_token)
    @http_server = create_http_server(message_handler)
  end # def register

  def run(queue)
    @queue = queue
    @logger.info("Starting http input listener", :address => "#{@host}:#{@port}", :ssl => "#{@ssl}")
    @http_server.run()
  end

  def stop
    @http_server.close() rescue nil
  end

  def close
    @http_server.close() rescue nil
  end

  def decode_body(headers, remote_address, body, default_codec, additional_codecs)
    content_type = headers.fetch("content_type", "")
    codec = additional_codecs.fetch(HttpUtil.getMimeType(content_type), default_codec)
    codec.decode(body) { |event| push_decoded_event(headers, remote_address, event) }
    codec.flush { |event| push_decoded_event(headers, remote_address, event) }
    true
  rescue => e
    @logger.error(
      "unable to process event.",
      :message => e.message,
      :class => e.class.name,
      :backtrace => e.backtrace
    )
    false
  end

  def push_decoded_event(headers, remote_address, event)
    event.set(@request_headers_target_field, headers)
    event.set(@remote_host_target_field, remote_address)
    decorate(event)
    @queue << event
  end

  def validate_ssl_settings!
    if !@ssl
      @logger.warn("SSL Certificate will not be used") if @ssl_certificate
      @logger.warn("SSL Key will not be used") if @ssl_key
      @logger.warn("SSL Java Key Store will not be used") if @keystore
    elsif !(ssl_key_configured? || ssl_jks_configured?)
      raise LogStash::ConfigurationError, "Certificate or JKS must be configured"
    end

    if @ssl && (original_params.key?("verify_mode") && original_params.key?("ssl_verify_mode"))
        raise LogStash::ConfigurationError, "Both 'ssl_verify_mode' and 'verify_mode' were set. Use only 'ssl_verify_mode'."
    elsif original_params.key?("verify_mode")
      @ssl_verify_mode_final = @verify_mode
    elsif original_params.key?("ssl_verify_mode")
      @ssl_verify_mode_final = @ssl_verify_mode
    else
      @ssl_verify_mode_final = @ssl_verify_mode
    end

    if @ssl && require_certificate_authorities? && !client_authentication?
      raise LogStash::ConfigurationError, "Using `ssl_verify_mode` or `verify_mode` set to PEER or FORCE_PEER, requires the configuration of `ssl_certificate_authorities`"
    elsif @ssl && !require_certificate_authorities? && client_authentication?
      raise LogStash::ConfigurationError, "The configuration of `ssl_certificate_authorities` requires setting `ssl_verify_mode` or `verify_mode` to PEER or FORCE_PEER"
    end
  end

  def create_http_server(message_handler)
    org.logstash.plugins.inputs.http.NettyHttpServer.new(
      @host, @port, message_handler, build_ssl_params(), @threads, @max_pending_requests, @max_content_length, @response_code)
  end

  def build_ssl_params
    return nil unless @ssl

    ssl_builder = nil

    if @keystore && @keystore_password
      ssl_builder = org.logstash.plugins.inputs.http.util.JksSslBuilder.new(@keystore, @keystore_password.value)
    else
      begin
        ssl_builder = org.logstash.plugins.inputs.http.util.SslSimpleBuilder.new(@ssl_certificate, @ssl_key, @ssl_key_passphrase.nil? ? nil : @ssl_key_passphrase.value)
        .setCipherSuites(normalized_ciphers)
      rescue java.lang.IllegalArgumentException => e
        raise LogStash::ConfigurationError.new(e)
      end

      if client_authentication?
        ssl_builder.setCertificateAuthorities(@ssl_certificate_authorities)
      end
    end

    ssl_context = ssl_builder.build()
    ssl_handler_provider = org.logstash.plugins.inputs.http.util.SslHandlerProvider.new(ssl_context)
    ssl_handler_provider.setVerifyMode(@ssl_verify_mode_final.upcase)
    ssl_handler_provider.setProtocols(convert_protocols)
    ssl_handler_provider.setHandshakeTimeoutMilliseconds(@ssl_handshake_timeout)

    ssl_handler_provider
  end

  def ssl_key_configured?
    !!(@ssl_certificate && @ssl_key)
  end

  def ssl_jks_configured?
    !!(@keystore && @keystore_password)
  end

  def client_authentication?
    @ssl_certificate_authorities && @ssl_certificate_authorities.size > 0
  end

  def require_certificate_authorities?
    @ssl_verify_mode_final == "force_peer" || @ssl_verify_mode_final == "peer"
  end

  def normalized_ciphers
    @cipher_suites.map(&:upcase)
  end

  def convert_protocols
    TLS.get_supported(@tls_min_version..@tls_max_version).map(&:name)
  end

end # class LogStash::Inputs::Http
