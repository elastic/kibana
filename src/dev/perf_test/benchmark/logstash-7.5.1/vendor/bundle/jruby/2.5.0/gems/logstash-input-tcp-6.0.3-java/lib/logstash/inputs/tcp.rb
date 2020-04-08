# encoding: utf-8

require "java"

require "logstash/inputs/base"
require "logstash/util/socket_peer"
require "logstash-input-tcp_jars"
require "logstash/inputs/tcp/decoder_impl"
require "logstash/inputs/tcp/compat_ssl_options"

require "socket"
require "openssl"

java_import org.logstash.tcp.InputLoop

# Read events over a TCP socket.
#
# Like stdin and file inputs, each event is assumed to be one line of text.
#
# Can either accept connections from clients or connect to a server,
# depending on `mode`.
#
# #### Accepting log4j2 logs
#
# Log4j2 can send JSON over a socket, and we can use that combined with our tcp
# input to accept the logs. 
#
# First, we need to configure your application to send logs in JSON over a
# socket. The following log4j2.xml accomplishes this task.
#
# Note, you will want to change the `host` and `port` settings in this
# configuration to match your needs.
#
#     <Configuration>
#       <Appenders>
#          <Socket name="Socket" host="localhost" port="12345">
#            <JsonLayout compact="true" eventEol="true" />
#         </Socket>
#       </Appenders>
#       <Loggers>
#         <Root level="info">
#           <AppenderRef ref="Socket"/>
#         </Root>
#       </Loggers>
#     </Configuration>
#
# To accept this in Logstash, you will want tcp input and a date filter:
#
#     input {
#       tcp {
#         port => 12345
#         codec => json
#       }
#     }
#
# and add a date filter to take log4j2's `timeMillis` field and use it as the
# event timestamp
#
#     filter {
#       date {
#         match => [ "timeMillis", "UNIX_MS" ]
#       }
#     }
class LogStash::Inputs::Tcp < LogStash::Inputs::Base
  config_name "tcp"

  default :codec, "line"

  # When mode is `server`, the address to listen on.
  # When mode is `client`, the address to connect to.
  config :host, :validate => :string, :default => "0.0.0.0"

  # When mode is `server`, the port to listen on.
  # When mode is `client`, the port to connect to.
  config :port, :validate => :number, :required => true

  # Mode to operate in. `server` listens for client connections,
  # `client` connects to a server.
  config :mode, :validate => ["server", "client"], :default => "server"

  # Proxy protocol support, only v1 is supported at this time
  # http://www.haproxy.org/download/1.5/doc/proxy-protocol.txt
  config :proxy_protocol, :validate => :boolean, :default => false

  # Enable SSL (must be set for other `ssl_` options to take effect).
  config :ssl_enable, :validate => :boolean, :default => false

  # Verify the identity of the other end of the SSL connection against the CA.
  # For input, sets the field `sslsubject` to that of the client certificate.
  config :ssl_verify, :validate => :boolean, :default => true

  # SSL certificate path
  config :ssl_cert, :validate => :path

  # SSL key path
  config :ssl_key, :validate => :path

  # SSL key passphrase
  config :ssl_key_passphrase, :validate => :password, :default => nil

  # An Array of extra X509 certificates to be added to the certificate chain.
  # Useful when the CA chain is not necessary in the system store.
  config :ssl_extra_chain_certs, :validate => :array, :default => []

  # Validate client certificates against these authorities. You can define multiple files or paths. All the certificates will be read and added to the trust store.
  config :ssl_certificate_authorities, :validate => :array, :default => []

  # Instruct the socket to use TCP keep alives. Uses OS defaults for keep alive settings.
  config :tcp_keep_alive, :validate => :boolean, :default => false

  # Option to allow users to avoid DNS Reverse Lookup.
  config :dns_reverse_lookup_enabled, :validate => :boolean, :default => true

  HOST_FIELD = "host".freeze
  HOST_IP_FIELD = "[@metadata][ip_address]".freeze
  PORT_FIELD = "port".freeze
  PROXY_HOST_FIELD = "proxy_host".freeze
  PROXY_PORT_FIELD = "proxy_port".freeze
  SSLSUBJECT_FIELD = "sslsubject".freeze

  def initialize(*args)
    super(*args)

    # monkey patch TCPSocket and SSLSocket to include socket peer
    TCPSocket.module_eval{include ::LogStash::Util::SocketPeer}
    OpenSSL::SSL::SSLSocket.module_eval{include ::LogStash::Util::SocketPeer}

    # threadsafe socket bookkeeping
    @server_socket = nil
    @client_socket = nil
    @connection_sockets = {}
    @socket_mutex = Mutex.new

    @ssl_context = nil
  end

  def register
    fix_streaming_codecs

    if server?
      ssl_context = get_ssl_context(SslOptions)

      @loop = InputLoop.new(@host, @port, DecoderImpl.new(@codec, self), @tcp_keep_alive,
                            ssl_context, @logger.to_java(org.apache.logging.log4j.Logger))
    end
  end

  def run(output_queue)
    @output_queue = output_queue
    if server?
      @logger.info("Starting tcp input listener", :address => "#{@host}:#{@port}", :ssl_enable => "#{@ssl_enable}")
      @loop.run
    else
      run_client()
    end
  end

  def stop
    # force close all sockets which will escape any blocking read with a IO exception
    # and any thread using them will exit.
    # catch all rescue nil on close to discard any close errors or invalid socket
    server_socket.close rescue nil
    @loop.close rescue nil
    client_socket.close rescue nil
    connection_sockets.each{|socket| socket.close rescue nil}
  end

  def close
    # see related comment in register: we must make sure to close the server socket here
    # because it is created in the register method and we could be in the context of having
    # register called but never run & stop, only close.
    # catch all rescue nil on close to discard any close errors or invalid socket
    server_socket.close rescue nil
    @loop.close rescue nil
  end

  def decode_buffer(client_ip_address, client_address, client_port, codec, proxy_address,
                    proxy_port, tbuf, socket)
    codec.decode(tbuf) do |event|
      if @proxy_protocol
        event.set(PROXY_HOST_FIELD, proxy_address) unless event.get(PROXY_HOST_FIELD)
        event.set(PROXY_PORT_FIELD, proxy_port) unless event.get(PROXY_PORT_FIELD)
      end
      enqueue_decorated(event, client_ip_address, client_address, client_port, socket)
    end
  end

  def flush_codec(codec, client_ip_address, client_address, client_port, socket)
    codec.flush do |event|
      enqueue_decorated(event, client_ip_address, client_address, client_port, socket)
    end
  end

  def dns_reverse_lookup_enabled?
    @dns_reverse_lookup_enabled
  end

  private

  def run_client()
    while !stop?
      self.client_socket = new_client_socket
      handle_socket(client_socket)
    end
  ensure
    # catch all rescue nil on close to discard any close errors or invalid socket
    client_socket.close rescue nil
  end

  def handle_socket(socket)
    client_address = socket.peeraddr[3]
    client_ip_address = socket.peeraddr[2]
    client_port = socket.peeraddr[1]
    peer = "#{client_address}:#{client_port}"
    first_read = true
    codec = @codec.clone
    while !stop?
      tbuf = socket.sysread(16384)
      if @proxy_protocol && first_read
        first_read = false
        pp_hdr, tbuf = tbuf.split("\r\n", 2)

        pp_info = pp_hdr.split(/\s/)
        # PROXY proto clientip proxyip clientport proxyport
        if pp_info[0] != "PROXY"
          @logger.error("invalid proxy protocol header label", :hdr => pp_hdr)
          raise IOError
        else
          proxy_address = pp_info[3]
          proxy_port = pp_info[5]
          client_address = pp_info[2]
          client_port = pp_info[4]
          client_ip_address = ''
        end
      end
      decode_buffer(client_ip_address, client_address, client_port, codec, proxy_address,
                    proxy_port, tbuf, socket)
    end
  rescue EOFError
    @logger.debug? && @logger.debug("Connection closed", :client => peer)
  rescue Errno::ECONNRESET
    @logger.debug? && @logger.debug("Connection reset by peer", :client => peer)
  rescue OpenSSL::SSL::SSLError => e
    # Fixes issue #23
    @logger.error("SSL Error", :exception => e, :backtrace => e.backtrace)
    socket.close rescue nil
  rescue => e
    # if plugin is stopping, don't bother logging it as an error
    !stop? && @logger.error("An error occurred. Closing connection", :client => peer, :exception => e, :backtrace => e.backtrace)
  ensure
    # catch all rescue nil on close to discard any close errors or invalid socket
    socket.close rescue nil
    flush_codec(codec, client_ip_address, client_address, client_port, socket)
  end

  def enqueue_decorated(event, client_ip_address, client_address, client_port, socket)
    event.set(HOST_FIELD, client_address) unless event.get(HOST_FIELD)
    event.set(HOST_IP_FIELD, client_ip_address) unless event.get(HOST_IP_FIELD)
    event.set(PORT_FIELD, client_port) unless event.get(PORT_FIELD)
    event.set(SSLSUBJECT_FIELD, socket.peer_cert.subject.to_s) if socket && @ssl_enable && @ssl_verify && event.get(SSLSUBJECT_FIELD).nil?
    decorate(event)
    @output_queue << event
  end
  
  def server?
    @mode == "server"
  end

  def ssl_context
    return @ssl_context if @ssl_context

    begin
      @ssl_context = OpenSSL::SSL::SSLContext.new
      @ssl_context.cert = OpenSSL::X509::Certificate.new(File.read(@ssl_cert))
      @ssl_context.key = OpenSSL::PKey::RSA.new(File.read(@ssl_key),@ssl_key_passphrase.value)
      if @ssl_extra_chain_certs.any?
        @ssl_context.extra_chain_cert = @ssl_extra_chain_certs.map {|cert_path| OpenSSL::X509::Certificate.new(File.read(cert_path)) }
        @ssl_context.extra_chain_cert.unshift(OpenSSL::X509::Certificate.new(File.read(@ssl_cert)))
      end
      if @ssl_verify
        @ssl_context.cert_store  = load_cert_store
        @ssl_context.verify_mode = OpenSSL::SSL::VERIFY_PEER|OpenSSL::SSL::VERIFY_FAIL_IF_NO_PEER_CERT
      end
    rescue => e
      @logger.error("Could not inititalize SSL context", :exception => e, :backtrace => e.backtrace)
      raise e
    end

    @ssl_context
  end

  def load_cert_store
    cert_store = OpenSSL::X509::Store.new
    cert_store.set_default_paths
    @ssl_certificate_authorities.each do |cert|
      cert_store.add_file(cert)
    end
    cert_store
  end

  def new_client_socket
    socket = TCPSocket.new(@host, @port)
    socket.setsockopt(Socket::SOL_SOCKET, Socket::SO_KEEPALIVE, @tcp_keep_alive)

    if @ssl_enable
      socket = OpenSSL::SSL::SSLSocket.new(socket, ssl_context)
      socket.setsockopt(Socket::SOL_SOCKET, Socket::SO_KEEPALIVE, @tcp_keep_alive)
      socket.connect
    end

    @logger.debug? && @logger.debug("Opened connection", :client => "#{socket.peer}")

    socket
  rescue OpenSSL::SSL::SSLError => e
    @logger.error("SSL Error", :exception => e, :backtrace => e.backtrace)
    # catch all rescue nil on close to discard any close errors or invalid socket
    socket.close rescue nil
    sleep(1) # prevent hammering peer
    retry
  rescue
    # if this exception occured while the plugin is stopping
    # just ignore and exit
    raise unless stop?
  end

  # threadsafe sockets bookkeeping

  def client_socket=(socket)
    @socket_mutex.synchronize{@client_socket = socket}
  end

  def client_socket
    @socket_mutex.synchronize{@client_socket}
  end

  def server_socket=(socket)
    @socket_mutex.synchronize{@server_socket = socket}
  end

  def server_socket
    @socket_mutex.synchronize{@server_socket}
  end

  def add_connection_socket(socket)
    @socket_mutex.synchronize{@connection_sockets[socket] = true}
    socket
  end

  def delete_connection_socket(socket)
    @socket_mutex.synchronize{@connection_sockets.delete(socket)}
  end

  def connection_sockets
    @socket_mutex.synchronize{@connection_sockets.keys.dup}
  end

  def get_ssl_context(options_class)
    ssl_context = options_class.builder
      .set_is_ssl_enabled(@ssl_enable)
      .set_should_verify(@ssl_verify)
      .set_ssl_cert(@ssl_cert)
      .set_ssl_key(@ssl_key)
      .set_ssl_key_passphrase(@ssl_key_passphrase.value)
      .set_ssl_extra_chain_certs(@ssl_extra_chain_certs.to_java(:string))
      .set_ssl_certificate_authorities(@ssl_certificate_authorities.to_java(:string))
      .build.toSslContext()
  end
end
