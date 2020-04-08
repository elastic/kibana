# encoding: utf-8
require "logstash/config/mixin"

# This module makes it easy to add a very fully configured HTTP client to logstash
# based on [Manticore](https://github.com/cheald/manticore).
# For an example of its usage see https://github.com/logstash-plugins/logstash-input-http_poller
module LogStash::PluginMixins::HttpClient
  class InvalidHTTPConfigError < StandardError; end

  def self.included(base)
    require 'manticore'
    base.extend(self)
    base.setup_http_client_config
  end

  public
  def setup_http_client_config
    # Timeout (in seconds) for the entire request
    config :request_timeout, :validate => :number, :default => 60

    # Timeout (in seconds) to wait for data on the socket. Default is `10s`
    config :socket_timeout, :validate => :number, :default => 10

    # Timeout (in seconds) to wait for a connection to be established. Default is `10s`
    config :connect_timeout, :validate => :number, :default => 10

    # Should redirects be followed? Defaults to `true`
    config :follow_redirects, :validate => :boolean, :default => true

    # Max number of concurrent connections. Defaults to `50`
    config :pool_max, :validate => :number, :default => 50

    # Max number of concurrent connections to a single host. Defaults to `25`
    config :pool_max_per_route, :validate => :number, :default => 25

    # Turn this on to enable HTTP keepalive support. We highly recommend setting `automatic_retries` to at least
    # one with this to fix interactions with broken keepalive implementations.
    config :keepalive, :validate => :boolean, :default => true

    # How many times should the client retry a failing URL. We highly recommend NOT setting this value
    # to zero if keepalive is enabled. Some servers incorrectly end keepalives early requiring a retry!
    # Note: if `retry_non_idempotent` is set only GET, HEAD, PUT, DELETE, OPTIONS, and TRACE requests will be retried.
    config :automatic_retries, :validate => :number, :default => 1

    # If `automatic_retries` is enabled this will cause non-idempotent HTTP verbs (such as POST) to be retried.
    config :retry_non_idempotent, :validate => :boolean, :default => false

    # How long to wait before checking if the connection is stale before executing a request on a connection using keepalive.
    # # You may want to set this lower, possibly to 0 if you get connection errors regularly
    # Quoting the Apache commons docs (this client is based Apache Commmons):
    # 'Defines period of inactivity in milliseconds after which persistent connections must be re-validated prior to being leased to the consumer. Non-positive value passed to this method disables connection validation. This check helps detect connections that have become stale (half-closed) while kept inactive in the pool.'
    # See https://hc.apache.org/httpcomponents-client-ga/httpclient/apidocs/org/apache/http/impl/conn/PoolingHttpClientConnectionManager.html#setValidateAfterInactivity(int)[these docs for more info]
    config :validate_after_inactivity, :validate => :number, :default => 200

    # If you need to use a custom X.509 CA (.pem certs) specify the path to that here
    config :cacert, :validate => :path

    # If you'd like to use a client certificate (note, most people don't want this) set the path to the x509 cert here
    config :client_cert, :validate => :path
    # If you're using a client certificate specify the path to the encryption key here
    config :client_key, :validate => :path

    # If you need to use a custom keystore (`.jks`) specify that here. This does not work with .pem keys!
    config :keystore, :validate => :path

    # Specify the keystore password here.
    # Note, most .jks files created with keytool require a password!
    config :keystore_password, :validate => :password

    # Specify the keystore type here. One of `JKS` or `PKCS12`. Default is `JKS`
    config :keystore_type, :validate => :string, :default => "JKS"

    # If you need to use a custom truststore (`.jks`) specify that here. This does not work with .pem certs!
    config :truststore, :validate => :path

    # Specify the truststore password here.
    # Note, most .jks files created with keytool require a password!
    config :truststore_password, :validate => :password

    # Specify the truststore type here. One of `JKS` or `PKCS12`. Default is `JKS`
    config :truststore_type, :validate => :string, :default => "JKS"

    # Enable cookie support. With this enabled the client will persist cookies
    # across requests as a normal web browser would. Enabled by default
    config :cookies, :validate => :boolean, :default => true

    # If you'd like to use an HTTP proxy . This supports multiple configuration syntaxes:
    #
    # 1. Proxy host in form: `http://proxy.org:1234`
    # 2. Proxy host in form: `{host => "proxy.org", port => 80, scheme => 'http', user => 'username@host', password => 'password'}`
    # 3. Proxy host in form: `{url =>  'http://proxy.org:1234', user => 'username@host', password => 'password'}`
    config :proxy

    # Username to use for HTTP auth.
    config :user, :validate => :string

    # Password to use for HTTP auth
    config :password, :validate => :password
  end

  public
  def client_config
    c = {
      connect_timeout: @connect_timeout,
      socket_timeout: @socket_timeout,
      request_timeout: @request_timeout,
      follow_redirects: @follow_redirects,
      automatic_retries: @automatic_retries,
      retry_non_idempotent: @retry_non_idempotent,
      check_connection_timeout: @validate_after_inactivity,
      pool_max: @pool_max,
      pool_max_per_route: @pool_max_per_route,
      cookies: @cookies,
      keepalive: @keepalive
    }

    if @proxy
      # Symbolize keys if necessary
      c[:proxy] = @proxy.is_a?(Hash) ?
        @proxy.reduce({}) {|memo,(k,v)| memo[k.to_sym] = v; memo} :
        @proxy
    end

    if @user
      if !@password || !@password.value
        raise ::LogStash::ConfigurationError, "User '#{@user}' specified without password!"
      end

      # Symbolize keys if necessary
      c[:auth] = {
        :user => @user,
        :password => @password.value,
        :eager => true
      }
    end

    c[:ssl] = {}
    if @cacert
      c[:ssl][:ca_file] = @cacert
    end

    if @truststore
      c[:ssl].merge!(
        :truststore => @truststore,
        :truststore_type => @truststore_type,
        :truststore_password => @truststore_password.value
      )
      
      if c[:ssl][:truststore_password].nil?
        raise LogStash::ConfigurationError, "Truststore declared without a password! This is not valid, please set the 'truststore_password' option"
      end
    end

    if @keystore
      c[:ssl].merge!(
        :keystore => @keystore,
        :keystore_type => @keystore_type,
        :keystore_password => @keystore_password.value
      )

      if c[:ssl][:keystore_password].nil?
        raise LogStash::ConfigurationError, "Keystore declared without a password! This is not valid, please set the 'keystore_password' option"
      end
    end

    if @client_cert && @client_key
      c[:ssl][:client_cert] = @client_cert
      c[:ssl][:client_key] = @client_key
    elsif !!@client_cert ^ !!@client_key
      raise InvalidHTTPConfigError, "You must specify both client_cert and client_key for an HTTP client, or neither!"
    end

    c
  end

  private
  def make_client
    Manticore::Client.new(client_config)
  end

  public
  def client
    @client ||= make_client
  end
end
