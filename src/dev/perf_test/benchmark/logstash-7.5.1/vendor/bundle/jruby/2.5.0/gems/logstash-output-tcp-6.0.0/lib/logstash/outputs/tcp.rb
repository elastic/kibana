# encoding: utf-8
require "logstash/outputs/base"
require "logstash/namespace"
require "thread"
require "logstash/util/socket_peer"

# Write events over a TCP socket.
#
# Each event json is separated by a newline.
#
# Can either accept connections from clients or connect to a server,
# depending on `mode`.
class LogStash::Outputs::Tcp < LogStash::Outputs::Base

  config_name "tcp"
  concurrency :single

  default :codec, "json"

  # When mode is `server`, the address to listen on.
  # When mode is `client`, the address to connect to.
  config :host, :validate => :string, :required => true

  # When mode is `server`, the port to listen on.
  # When mode is `client`, the port to connect to.
  config :port, :validate => :number, :required => true

  # When connect failed,retry interval in sec.
  config :reconnect_interval, :validate => :number, :default => 10

  # Mode to operate in. `server` listens for client connections,
  # `client` connects to a server.
  config :mode, :validate => ["server", "client"], :default => "client"

  # Enable SSL (must be set for other `ssl_` options to take effect).
  config :ssl_enable, :validate => :boolean, :default => false

  # Verify the identity of the other end of the SSL connection against the CA.
  # For input, sets the field `sslsubject` to that of the client certificate.
  config :ssl_verify, :validate => :boolean, :default => false

  # The SSL CA certificate, chainfile or CA path. The system CA path is automatically included.
  config :ssl_cacert, :validate => :path

  # SSL certificate path
  config :ssl_cert, :validate => :path

  # SSL key path
  config :ssl_key, :validate => :path

  # SSL key passphrase
  config :ssl_key_passphrase, :validate => :password, :default => nil

  class Client
    public
    def initialize(socket, logger)
      @socket = socket
      @logger = logger
      @queue  = Queue.new
    end

    public
    def run
      loop do
        begin
          @socket.write(@queue.pop)
        rescue => e
          @logger.warn("tcp output exception", :socket => @socket,
                       :exception => e)
          break
        end
      end
    end # def run

    public
    def write(msg)
      @queue.push(msg)
    end # def write
  end # class Client

  private
  def setup_ssl
    require "openssl"

    @ssl_context = OpenSSL::SSL::SSLContext.new
    if @ssl_cert
      @ssl_context.cert = OpenSSL::X509::Certificate.new(File.read(@ssl_cert))
      if @ssl_key
        @ssl_context.key = OpenSSL::PKey::RSA.new(File.read(@ssl_key),@ssl_key_passphrase)
      end
    end
    if @ssl_verify
      @cert_store = OpenSSL::X509::Store.new
      # Load the system default certificate path to the store
      @cert_store.set_default_paths
      if File.directory?(@ssl_cacert)
        @cert_store.add_path(@ssl_cacert)
      else
        @cert_store.add_file(@ssl_cacert)
      end
      @ssl_context.cert_store = @cert_store
      @ssl_context.verify_mode = OpenSSL::SSL::VERIFY_PEER|OpenSSL::SSL::VERIFY_FAIL_IF_NO_PEER_CERT
    end
  end # def setup_ssl

  public
  def register
    require "socket"
    require "stud/try"
    if @ssl_enable
      setup_ssl
    end # @ssl_enable

    if server?
      @logger.info("Starting tcp output listener", :address => "#{@host}:#{@port}")
      begin
        @server_socket = TCPServer.new(@host, @port)
      rescue Errno::EADDRINUSE
        @logger.error("Could not start TCP server: Address in use",
                      :host => @host, :port => @port)
        raise
      end
      if @ssl_enable
        @server_socket = OpenSSL::SSL::SSLServer.new(@server_socket, @ssl_context)
      end # @ssl_enable
      @client_threads = []

      @accept_thread = Thread.new(@server_socket) do |server_socket|
        loop do
          Thread.start(server_socket.accept) do |client_socket|
            # monkeypatch a 'peer' method onto the socket.
            client_socket.instance_eval { class << self; include ::LogStash::Util::SocketPeer end }
            @logger.debug("Accepted connection", :client => client_socket.peer,
                          :server => "#{@host}:#{@port}")
            client = Client.new(client_socket, @logger)
            Thread.current[:client] = client
            @client_threads << Thread.current
            client.run
          end
        end
      end

      @codec.on_event do |event, payload|
        @client_threads.each do |client_thread|
          client_thread[:client].write(payload)
        end
        @client_threads.reject! {|t| !t.alive? }
      end
    else
      client_socket = nil
      @codec.on_event do |event, payload|
        begin
          client_socket = connect unless client_socket
          r,w,e = IO.select([client_socket], [client_socket], [client_socket], nil)
          # don't expect any reads, but a readable socket might
          # mean the remote end closed, so read it and throw it away.
          # we'll get an EOFError if it happens.
          client_socket.sysread(16384) if r.any?

          # Now send the payload
          client_socket.syswrite(payload) if w.any?
        rescue => e
          @logger.warn("tcp output exception", :host => @host, :port => @port,
                       :exception => e, :backtrace => e.backtrace)
          client_socket.close rescue nil
          client_socket = nil
          sleep @reconnect_interval
          retry
        end
      end
    end
  end # def register

  private
  def connect
    Stud::try do
      client_socket = TCPSocket.new(@host, @port)
      if @ssl_enable
        client_socket = OpenSSL::SSL::SSLSocket.new(client_socket, @ssl_context)
        begin
          client_socket.connect
        rescue OpenSSL::SSL::SSLError => ssle
          @logger.error("SSL Error", :exception => ssle,
                        :backtrace => ssle.backtrace)
          # NOTE(mrichar1): Hack to prevent hammering peer
          sleep(5)
          raise
        end
      end
      client_socket.instance_eval { class << self; include ::LogStash::Util::SocketPeer end }
      @logger.debug("Opened connection", :client => "#{client_socket.peer}")
      return client_socket
    end
  end # def connect

  private
  def server?
    @mode == "server"
  end # def server?

  public
  def receive(event)
    @codec.encode(event)
  end # def receive
end # class LogStash::Outputs::Tcp
