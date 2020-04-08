# encoding: utf-8
require "march_hare/shutdown_listener"
require "set"
require "march_hare/thread_pools"
require "march_hare/exception_handler"
require "java"
require "logger"

module MarchHare
  java_import com.rabbitmq.client.ConnectionFactory
  java_import com.rabbitmq.client.Connection
  java_import com.rabbitmq.client.BlockedListener
  java_import com.rabbitmq.client.TrustEverythingTrustManager
  java_import com.rabbitmq.client.MissedHeartbeatException
  java_import com.rabbitmq.client.Address

  java_import javax.net.ssl.SSLContext
  java_import javax.net.ssl.KeyManagerFactory
  java_import java.security.KeyStore
  java_import javax.net.ssl.TrustManagerFactory

  # Connection to a RabbitMQ node.
  #
  # Used to open and close connections and open (create) new channels.
  #
  # @see .connect
  # @see #create_channel
  # @see #close
  # @see http://rubymarchhare.info/articles/getting_started.html Getting Started guide
  # @see http://rubymarchhare.info/articles/connecting.html Connecting to RabbitMQ guide
  class Session

    #
    # API
    #

    # Default reconnection interval for TCP connection failures
    DEFAULT_NETWORK_RECOVERY_INTERVAL = 5.0

    # Connects to a RabbitMQ node.
    #
    # @param [Hash] options Connection options
    #
    # @option options [Numeric] :executor_shutdown_timeout (30.0) when recovering from a network failure how long should we wait for the current threadpool to finish handling its messages
    # @option options [String] :host ("127.0.0.1") Hostname or IP address to connect to
    # @option options [Array<String>] :hosts (["127.0.0.1"]) Array of hostnames or ips to connect to. The connection returned is the first in the array that succeeds.
    # @option options [Array<String>] :addresses (["127.0.0.1:5672", "localhost:5673"]) Array of addresses to connect to. The connection returned is the first in the array that succeeds.
    # @option options [Integer] :port (5672) Port RabbitMQ listens on
    # @option options [String] :username ("guest") Username
    # @option options [String] :password ("guest") Password
    # @option options [String] :vhost ("/") Virtual host to use
    # @option options [Integer] :requested_heartbeat (580) Heartbeat timeout used. 0 means no heartbeat.
    # @option options [Boolean, String] :tls (false) Set to true to use TLS/SSL connection or TLS version name as a string, e.g. "TLSv1.1".
    #                                   This will switch port to 5671 by default.
    # @option options [String] :tls_certificate_path Path to a PKCS12 certificate.
    # @option options [java.util.concurrent.ThreadFactory] :thread_factory Thread factory RabbitMQ Java client will use (useful in restricted PaaS platforms such as GAE)
    # @option options [Logger] :logger The logger.  If missing, one is created using :log_file and :log_level.
    # @option options [IO, String] :log_file The file or path to use when creating a logger.  Defaults to STDOUT.
    # @option options [Integer] :log_level The log level to use when creating a logger.  Defaults to LOGGER::WARN
    #
    # @see http://rubymarchhare.info/articles/connecting.html Connecting to RabbitMQ guide
    def self.connect(options = {})
      cf = ConnectionFactory.new

      if options[:uri]
        cf.uri          = options[:uri]          if options[:uri]
      elsif options[:hosts] || options[:addresses]
        cf.virtual_host = vhost_from(options)    if include_vhost?(options)
        cf.username     = username_from(options) if include_username?(options)
        cf.password     = password_from(options) if include_password?(options)
      else
        cf.host         = hostname_from(options) if include_host?(options)
        cf.port         = options[:port].to_i    if options[:port]
        cf.virtual_host = vhost_from(options)    if include_vhost?(options)
        cf.username     = username_from(options) if include_username?(options)
        cf.password     = password_from(options) if include_password?(options)
      end

      cf.connection_timeout  = timeout_from(options)  if include_timeout?(options)

      cf.requested_heartbeat = heartbeat_from(options)
      cf.connection_timeout  = connection_timeout_from(options) if include_connection_timeout?(options)

      cf.thread_factory      = thread_factory_from(options)    if include_thread_factory?(options)

      tls = (options[:ssl] || options[:tls])
      case tls
      when true then
        cf.use_ssl_protocol
      when String then
        options[:logger].info("Using TLS/SSL version #{tls}") if options[:logger]
        # Note: `options[:trust_manager] = com.rabbitmq.client.TrustEverythingTrustManager.new`
        # can be set to effectively disable TLS verification.
        if (cert_path = tls_certificate_path_from(options)) && (password = tls_certificate_password_from(options))
          ctx = SSLContext.get_instance(tls)
          pwd = password.to_java.to_char_array
          begin
            is = File.new(cert_path).to_inputstream
            ks = KeyStore.get_instance('PKCS12')
            ks.load(is, pwd)

            kmf = KeyManagerFactory.get_instance("SunX509")
            kmf.init(ks, pwd)

            if options[:trust_manager]
              ctx.init(kmf.get_key_managers, [options[:trust_manager]], nil)
            else
              # use the key store as the trust store
              tmf = TrustManagerFactory.get_instance(TrustManagerFactory.getDefaultAlgorithm());
              tmf.init(ks)
              ctx.init(kmf.get_key_managers, tmf.getTrustManagers(), nil)
            end

            cf.use_ssl_protocol(ctx)
          rescue Java::JavaLang::Throwable => e
            message = e.message
            message << "\n"
            message << e.backtrace.join("\n")

            raise SSLContextException.new(message)
          ensure
            is.close if is
          end
        elsif options[:trust_manager]
          cf.use_ssl_protocol(tls, options[:trust_manager])
        else
          cf.use_ssl_protocol(tls)
        end
      end

      new(cf, options)
    end

    class SSLContextException < StandardError
    end


    # @return [Array<MarchHare::Channel>] Channels opened on this connection
    attr_reader :channels

    # @return [::Logger] Logger instance
    attr_reader :logger


    # @private
    def initialize(connection_factory, opts = {})
      @cf               = connection_factory

      log_file                   = opts[:log_file] || STDOUT
      log_level                  = opts[:log_level] || ENV["MARCH_HARE_LOG_LEVEL"] || Logger::WARN
      @logger                    = opts.fetch(:logger, init_default_logger(log_file, log_level))
      @cf.exception_handler      = opts.fetch(:exception_handler, init_default_exception_handler(@logger))

      # March Hare uses its own connection recovery implementation and
      # as of Java client 4.x automatic recovery is enabled by
      # default. MK.
      @cf.automatic_recovery_enabled = false
      @cf.topology_recovery_enabled  = false

      @uri              = opts[:uri]
      @uses_uri         = !(@uri.nil?)
      # executors cannot be restarted after shutdown,
      # so we really need a factory here. MK.
      @executor_factory = opts[:executor_factory] || build_executor_factory_from(opts)
      # we expect this option to be specified in seconds
      @executor_shutdown_timeout = opts.fetch(:executor_shutdown_timeout, 30.0)

      @addresses        = self.class.addresses_from(opts)
      @connection       = build_new_connection
      @channels         = JavaConcurrent::ConcurrentHashMap.new

      # should automatic recovery from network failures be used?
      @automatically_recover = if opts[:automatically_recover].nil? && opts[:automatic_recovery].nil?
                                 true
                               else
                                 opts[:automatically_recover] || opts[:automatic_recovery]
                               end
      @network_recovery_interval = opts.fetch(:network_recovery_interval, DEFAULT_NETWORK_RECOVERY_INTERVAL)
      @shutdown_hooks            = Array.new
      @blocked_connection_hooks  = Array.new
      @connection_recovery_hooks = Array.new

      if @automatically_recover
        self.add_automatic_recovery_hook
      end
    end

    # Opens a new channel.
    #
    # @param [Integer] (nil): Channel number. Pass nil to let MarchHare allocate an available number
    #                         in a safe way.
    #
    # @return [MarchHare::Channel] Newly created channel
    # @see MarchHare::Channel
    # @see http://rubymarchhare.info/articles/getting_started.html Getting Started guide
    def create_channel(n = nil)
      jc = if n
             @connection.create_channel(n)
           else
             @connection.create_channel
           end
      if jc.nil?
        error_message = <<-MSG
          Unable to create a channel. This is likely due to having a channel_max setting
          on the rabbitmq broker (see https://www.rabbitmq.com/configure.html).
          There are currently #{@channels.size} channels on this connection.
        MSG
        raise ::MarchHare::ChannelError.new(error_message, false)
      end

      ch = Channel.new(self, jc)
      register_channel(ch)

      ch
    end

    # Closes connection gracefully.
    #
    # This includes shutting down consumer work pool gracefully,
    # waiting up to 5 seconds for all consumer deliveries to be
    # processed.
    def close
      @channels.select { |_, ch| ch.open? }.each do |_, ch|
        ch.close
      end

      maybe_shut_down_executor
      @connection.close
    end

    # @return [Boolean] true if connection is open, false otherwise
    def open?
      @connection.open?
    end
    alias connected? open?

    # @return [Boolean] true if this channel is closed
    def closed?
      !@connection.open?
    end

    # Defines a shutdown event callback. Shutdown events are
    # broadcasted when a connection is closed, either explicitly
    # or forcefully, or due to a network/peer failure.
    def on_shutdown(&block)
      sh = ShutdownListener.new(self, &block)
      @shutdown_hooks << sh

      @connection.add_shutdown_listener(sh)

      sh
    end

    # Defines a connection.blocked handler
    def on_blocked(&block)
      listener = BlockBlockedUnblockedListener.for_blocked(block)
      @blocked_connection_hooks << listener

      self.add_blocked_listener(listener)
    end

    # Defines a connection.unblocked handler
    def on_unblocked(&block)
      listener = BlockBlockedUnblockedListener.for_unblocked(block)
      @blocked_connection_hooks << listener

      self.add_blocked_listener(listener)
    end

    def add_blocked_listener(listener)
      @connection.add_blocked_listener(listener)
    end

    # Clears all callbacks defined with #on_blocked and #on_unblocked.
    def clear_blocked_connection_callbacks
      @blocked_connection_hooks.clear

      @connection.clear_blocked_listeners
    end

    def on_recovery_start(&block)
      listener = RecoveryListener.for_start(block)
      @connection_recovery_hooks << listener
    end

    def on_recovery(&block)
      listener = RecoveryListener.for_finish(block)
      @connection_recovery_hooks << listener
    end

    # Clears all callbacks defined with #on_recovery_started and #on_recovery
    def clear_connection_recovery_callbacks
      @connection_recovery_hooks.clear
    end

    # @private
    def add_automatic_recovery_hook
      fn = Proc.new do |_, signal|
        if should_initiate_connection_recovery?(signal)
          self.automatically_recover
        end
      end

      @automatic_recovery_hook = self.on_shutdown(&fn)
    end

    # @private
    def should_initiate_connection_recovery?(signal)
      !signal.initiated_by_application || signal.instance_of?(MissedHeartbeatException)
    end

    # @private
    def disable_automatic_recovery
      @connection.remove_shutdown_listener(@automatic_recovery_hook) if @automatic_recovery_hook
    end

    # Begins automatic connection recovery (typically only used internally
    # to recover from network failures)
    def automatically_recover
      @logger.debug("session: begin automatic connection recovery")

      fire_recovery_start_hooks

      ms = @network_recovery_interval * 1000
      # recovering immediately makes little sense. Wait a bit first. MK.
      java.lang.Thread.sleep(ms)

      new_connection = converting_rjc_exceptions_to_ruby do
        reconnecting_on_network_failures(ms) { build_new_connection }
      end
      self.recover_shutdown_hooks(new_connection)
      self.recover_connection_block_hooks(new_connection)

      # sorting channels by id means that the cases like the following:
      #
      # ch1 = conn.create_channel
      # ch2 = conn.create_channel
      #
      # x   = ch1.topic("logs", :durable => false)
      # q   = ch2.queue("", :exclusive => true)
      #
      # q.bind(x)
      #
      # will recover correctly because exchanges and queues will be recovered
      # in the order the user expects and before bindings.
      @channels.sort_by {|id, _| id}.each do |id, ch|
        begin
          ch.automatically_recover(self, new_connection)
        rescue Exception, java.io.IOException => e
          @logger.error(e)
        end
      end

      @connection = new_connection

      fire_recovery_hooks

      @connection
    end

    # @private
    def recover_shutdown_hooks(connection)
      @logger.debug("session: recover_shutdown_hooks")
      @shutdown_hooks.each do |sh|
        connection.add_shutdown_listener(sh)
      end
    end

    # @private
    def recover_connection_block_hooks(connection)
      @logger.debug("session: recover_connection_block_hooks")
      @blocked_connection_hooks.each do |listener|
        connection.add_blocked_listener(listener)
      end
    end

    # Flushes the socket used by this connection.
    def flush
      @connection.flush
    end

    # @private
    def heartbeat=(n)
      @connection.heartbeat = n
    end

    # No-op, exists for better API compatibility with Bunny.
    def start
      # no-op
      #
      # This method mimics Bunny::Session#start in Bunny 0.9.
      # Without it, #method_missing will proxy the call to com.rabbitmq.client.AMQConnection,
      # which happens to have a #start method which is not idempotent.
      #
      # So we stub out #start in case someone migrating from Bunny forgets to remove
      # the call to #start. MK.
      self
    end

    def username
      @cf.username
    end
    alias user username

    def vhost
      @cf.virtual_host
    end

    def hostname
      @cf.host
    end
    alias host hostname

    def port
      @cf.port
    end

    def tls?
      if @uses_uri
        u = java.net.URI.new(@uri.to_java_string)

        u.scheme == "amqps"
      else
        self.port == ConnectionFactory.DEFAULT_AMQP_OVER_SSL_PORT
      end
    end
    alias ssl? tls?

    def method_missing(selector, *args)
      @connection.__send__(selector, *args)
    end

    # @return [String]
    def to_s
      "#<#{self.class.name}:#{object_id} #{@cf.username}@#{@cf.host}:#{@cf.port}, vhost=#{@cf.virtual_host}>"
    end


    #
    # Implementation
    #

    # @private
    def register_channel(ch)
      @channels[ch.channel_number] = ch
    end

    # @private
    def unregister_channel(ch)
      @channels.delete(ch.channel_number)
    end

    protected

    # @private
    def self.hostname_from(options)
      options[:host] || options[:hostname] || ConnectionFactory::DEFAULT_HOST
    end

    # @private
    def self.addresses_from(options)
      options[:addresses] || options[:hosts] || [address_with_port_from(options)]
    end

    # @private
    def self.address_with_port_from(options)
      if options[:port]
        "#{hostname_from(options)}:#{options[:port]}"
      else
        hostname_from(options)
      end
    end

    # @private
    def self.include_host?(options)
      !!(options[:host] || options[:hostname])
    end

    # @private
    def self.vhost_from(options)
      options[:virtual_host] || options[:vhost] || ConnectionFactory::DEFAULT_VHOST
    end

    # @private
    def self.include_vhost?(options)
      !!(options[:virtual_host] || options[:vhost])
    end

    # @private
    def self.timeout_from(options)
      options[:connection_timeout] || options[:timeout]
    end

    # @private
    def self.include_timeout?(options)
      !!(options[:connection_timeout] || options[:timeout])
    end

    # @private
    def self.username_from(options)
      options[:username] || options[:user] || ConnectionFactory::DEFAULT_USER
    end

    # @private
    def self.heartbeat_from(options)
      options[:heartbeat_interval] || options[:requested_heartbeat] || options[:heartbeat] || ConnectionFactory::DEFAULT_HEARTBEAT
    end

    # @private
    def self.connection_timeout_from(options)
      options[:connection_timeout_interval] || options[:connection_timeout] || ConnectionFactory::DEFAULT_CONNECTION_TIMEOUT
    end

    # @private
    def self.include_username?(options)
      !!(options[:username] || options[:user])
    end

    # @private
    def self.password_from(options)
      options[:password] || options[:pass] || ConnectionFactory::DEFAULT_PASS
    end

    # @private
    def self.include_password?(options)
      !!(options[:password] || options[:pass])
    end

    # @private
    def self.include_connection_timeout?(options)
      !!(options[:connection_timeout_interval] || options[:connection_timeout])
    end

    # @private
    def self.thread_factory_from(opts)
      opts[:thread_factory]
    end

    # @private
    def self.include_thread_factory?(opts)
      !!opts[:thread_factory]
    end

    # @private
    def endpoint_info_from(cf)
      if @uses_uri
        uri_without_credentials = URI.parse(@uri).tap do |u|
          u.password = "REDACTED"
          u.to_s
        end
        "Target URI: #{uri_without_credentials}"
      else
        "Target host list: #{@addresses.join(', ')}, target virtual host: #{cf.virtual_host}, username: #{cf.username}"
      end
    end

    # Executes a block, catching Java exceptions RabbitMQ Java client throws and
    # transforms them to Ruby exceptions that are then re-raised.
    #
    # @private
    def converting_rjc_exceptions_to_ruby(&block)
      begin
        block.call
      rescue java.net.ConnectException
        raise ConnectionRefused.new("Connection was refused. #{endpoint_info_from(@cf)}")
      rescue java.net.NoRouteToHostException
        raise ConnectionRefused.new("Connection failed: no route to target host. #{endpoint_info_from(@cf)}")
      rescue java.net.UnknownHostException
        raise ConnectionRefused.new("Connection refused: target host unknown (cannot be resolved). #{endpoint_info_from(@cf)}")
      rescue java.net.SocketException
        raise ConnectionRefused.new("Connection failed due to a socket exception. #{endpoint_info_from(@cf)}")
      rescue java.util.concurrent.TimeoutException
        raise ConnectionRefused.new("Connection timed out. #{endpoint_info_from(@cf)}")
      rescue com.rabbitmq.client.AuthenticationFailureException
        raise AuthenticationFailureError.new(@cf.username, @cf.virtual_host, @cf.password.bytesize)
      rescue com.rabbitmq.client.PossibleAuthenticationFailureException
        raise PossibleAuthenticationFailureError.new(@cf.username, @cf.virtual_host, @cf.password.bytesize)
      end
    end

    # @private
    def reconnecting_on_network_failures(interval_in_ms, &fn)
      @logger.debug("session: reconnecting_on_network_failures")
      begin
        fn.call
      rescue IOError, MarchHare::ConnectionRefused, java.io.IOException, java.util.concurrent.TimeoutException
        java.lang.Thread.sleep(interval_in_ms)

        retry
      end
    end

    # @private
    def build_new_connection
      if @uses_uri
        @logger.debug("session: instantiating a new connection using a URI")
        new_uri_connection_impl(@uri)
      else
        @logger.debug("session: instantiating a new connection using a set of addresses: #{@addresses.join(',')}")
        new_connection_impl(@addresses)
      end
    end

    # @private
    def new_connection_impl(addresses)
      addrs = Address.parse_addresses(addresses.join(','))

      converting_rjc_exceptions_to_ruby do
        if @executor_factory
          shut_down_executor_pool_and_await_timeout
          @executor = @executor_factory.call
          @cf.new_connection(@executor, addrs)
        else
          @cf.new_connection(addrs)
        end
      end
    end

    # @private
    def new_uri_connection_impl(uri)
      @cf.uri = uri
      converting_rjc_exceptions_to_ruby do
        if @executor_factory
          shut_down_executor_pool_and_await_timeout
          @executor = @executor_factory.call
          @cf.new_connection(@executor)
        else
          @cf.new_connection
        end
      end
    end

    # @private
    def maybe_shut_down_executor
      @executor.shutdown if defined?(@executor) && @executor
    end

    def shut_down_executor_pool_and_await_timeout
      return unless defined?(@executor) && @executor
      ms_to_wait = (@executor_shutdown_timeout * 1000).to_i
      @executor.shutdown()
      unless @executor.awaitTermination(ms_to_wait, java.util.concurrent.TimeUnit::MILLISECONDS)
        @executor.shutdownNow()
      end
    rescue java.lang.InterruptedException
      #no op, just means we got a forced shutdown
    end

    # Makes it easier to construct executor factories.
    # @private
    def build_executor_factory_from(opts)
      # if we are given a thread pool size, construct
      # a callable that creates a fixed size executor
      # of that size. MK.
      if n = opts[:thread_pool_size]
        return Proc.new { MarchHare::ThreadPools.fixed_of_size(n) }
      end
    end

    def self.tls_certificate_path_from(opts)
      opts[:tls_cert] || opts[:ssl_cert] || opts[:tls_cert_path] || opts[:ssl_cert_path] || opts[:tls_certificate_path] || opts[:ssl_certificate_path]
    end

    # @private
    def tls_certificate_path_from(opts)
      self.class.tls_certificate_path_from(opts)
    end

    def self.tls_certificate_password_from(opts)
      opts[:tls_certificate_password] || opts[:ssl_certificate_password] || opts[:cert_password] || opts[:certificate_password]
    end

    # @private
    def tls_certificate_password_from(opts)
      self.class.tls_certificate_password_from(opts)
    end

    # @private
    def init_default_exception_handler(logger)
      ExceptionHandler.new(logger)
    end

    # @private
    def init_default_logger(logfile, level)
      lgr = ::Logger.new(logfile)
      lgr.level    = normalize_log_level(level)
      lgr.progname = self.to_s
      lgr
    end

    # @private
    def normalize_log_level(level)
      case level
      when :debug, Logger::DEBUG, "debug" then Logger::DEBUG
      when :info,  Logger::INFO,  "info"  then Logger::INFO
      when :warn,  Logger::WARN,  "warn"  then Logger::WARN
      when :error, Logger::ERROR, "error" then Logger::ERROR
      when :fatal, Logger::FATAL, "fatal" then Logger::FATAL
      else
        Logger::WARN
      end
    end

    # @private
    def fire_recovery_start_hooks
      @logger.debug "Have #{@connection_recovery_hooks.size} recovery start hooks to run"
      @connection_recovery_hooks.each do |recovery_listener|
        recovery_listener.handle_recovery_started(self)
      end
    end

    # @private
    def fire_recovery_hooks
      @logger.debug "Have #{@connection_recovery_hooks.size} recovery completion hooks to run"
      @connection_recovery_hooks.each do |recovery_listener|
        recovery_listener.handle_recovery(self)
      end
    end

    # Ruby blocks-based BlockedListener that handles
    # connection.blocked and connection.unblocked.
    # @private
    class BlockBlockedUnblockedListener
      include com.rabbitmq.client.BlockedListener

      def self.for_blocked(block)
        new(block, noop_fn1)
      end

      def self.for_unblocked(block)
        new(noop_fn0, block)
      end

      # Returns a no-op function of arity 0.
      def self.noop_fn0
        Proc.new {}
      end

      # Returns a no-op function of arity 1.
      def self.noop_fn1
        Proc.new { |_| }
      end

      def initialize(on_blocked, on_unblocked)
        @blocked   = on_blocked
        @unblocked = on_unblocked
      end

      def handle_blocked(reason)
        @blocked.call(reason)
      end

      def handle_unblocked()
        @unblocked.call()
      end
    end

    # Ruby blocks-based RecoveryListener that handles
    # connection recovery_started and recovery
    class RecoveryListener
      NOOP_FN1 = Proc.new { |_| }
      private_constant :NOOP_FN1

      def self.for_start(block)
        new(block, NOOP_FN1)
      end

      def self.for_finish(block)
        new(NOOP_FN1, block)
      end

      def initialize(before_recovery, after_recovery)
        @recovery_start_hook = before_recovery
        @recovery_hook = after_recovery
      end

      def handle_recovery_started(recoverable)
        @recovery_start_hook.call(recoverable)
      end

      def handle_recovery(recoverable)
        @recovery_hook.call(recoverable)
      end
    end
  end
end
