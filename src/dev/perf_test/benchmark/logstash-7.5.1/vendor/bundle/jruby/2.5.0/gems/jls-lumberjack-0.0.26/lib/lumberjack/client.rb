# encoding: utf-8
require "lumberjack"
require "socket"
require "thread"
require "openssl"
require "zlib"

module Lumberjack
  class Client
    def initialize(opts={})
      @opts = {
        :port => 0,
        :addresses => [],
        :ssl_certificate => nil,
        :ssl => true,
        :json => false,
      }.merge(opts)

      @opts[:addresses] = [@opts[:addresses]] if @opts[:addresses].class == String
      raise "Must set a port." if @opts[:port] == 0
      raise "Must set atleast one address" if @opts[:addresses].empty? == 0
      raise "Must set a ssl certificate or path" if @opts[:ssl_certificate].nil? && @opts[:ssl]

      @socket = connect
    end

    private
    def connect
      addrs = @opts[:addresses].shuffle
      begin
        raise "Could not connect to any hosts" if addrs.empty?
        opts = @opts
        opts[:address] = addrs.pop
        Lumberjack::Socket.new(opts)
      rescue *[Errno::ECONNREFUSED,SocketError]
        retry
      end
    end

    public
    def write(elements, opts={})
      @socket.write_sync(elements, opts)
    end

    public
    def host
      @socket.host
    end
  end

  class Socket
    # Create a new Lumberjack Socket.
    #
    # - options is a hash. Valid options are:
    #
    # * :port - the port to listen on
    # * :address - the host/address to bind to
    # * :ssl - enable/disable ssl support
    # * :ssl_certificate - the path to the ssl cert to use.
    #                      If ssl_certificate is not set, a plain tcp connection
    #                      will be used.
    attr_reader :sequence
    attr_reader :host
    def initialize(opts={})
      @sequence = 0
      @last_ack = 0
      @opts = {
        :port => 0,
        :address => "127.0.0.1",
        :ssl_certificate => nil,
        :ssl => true,
        :json => false,
      }.merge(opts)
      @host = @opts[:address]

      connection_start(opts)
    end

    private
    def connection_start(opts)
      tcp_socket = TCPSocket.new(opts[:address], opts[:port])
      if !opts[:ssl]
        @socket = tcp_socket
      else
        certificate = OpenSSL::X509::Certificate.new(File.read(opts[:ssl_certificate]))

        certificate_store = OpenSSL::X509::Store.new
        certificate_store.add_cert(certificate)

        ssl_context = OpenSSL::SSL::SSLContext.new
        ssl_context.verify_mode = OpenSSL::SSL::VERIFY_PEER
        ssl_context.cert_store = certificate_store

        @socket = OpenSSL::SSL::SSLSocket.new(tcp_socket, ssl_context)
        @socket.connect
      end
    end

    private 
    def inc
      @sequence = 0 if @sequence + 1 > Lumberjack::SEQUENCE_MAX
      @sequence = @sequence + 1
    end

    private
    def send_window_size(size)
      @socket.syswrite(["1", "W", size].pack("AAN"))
    end

    private
    def send_payload(payload)
      # SSLSocket has a limit of 16k per message
      # execute multiple writes if needed
      bytes_written = 0
      while bytes_written < payload.bytesize
        bytes_written += @socket.syswrite(payload.byteslice(bytes_written..-1))
      end
    end

    public
    def write_sync(elements, opts={})
      options = {
        :json => @opts[:json],
      }.merge(opts)

      elements = [elements] if elements.is_a?(Hash)
      send_window_size(elements.size)

      encoder = options[:json] ? JsonEncoder : FrameEncoder
      payload = elements.map { |element| encoder.to_frame(element, inc) }.join
      compress = compress_payload(payload)
      send_payload(compress)

      ack(elements.size)
    end

    private 
    def compress_payload(payload)
      compress = Zlib::Deflate.deflate(payload)
      ["1", "C", compress.bytesize, compress].pack("AANA*")
    end

    private
    def ack(size)
      _, type = read_version_and_type
      raise "Whoa we shouldn't get this frame: #{type}" if type != "A"
      @last_ack = read_last_ack
    end

    private
    def unacked_sequence_size
      sequence - (@last_ack + 1)
    end

    private
    def read_version_and_type
      version = @socket.read(1)
      type    = @socket.read(1)
      [version, type]
    end

    private
    def read_last_ack
      @socket.read(4).unpack("N").first
    end
  end

  module JsonEncoder
    def self.to_frame(hash, sequence)
      json = Lumberjack::json.dump(hash)
      json_length = json.bytesize
      pack = "AANNA#{json_length}"
      frame = ["1", "J", sequence, json_length, json]
      frame.pack(pack)
    end
  end # JsonEncoder

  module FrameEncoder
    def self.to_frame(hash, sequence)
      frame = ["1", "D", sequence]
      pack = "AAN"
      keys = deep_keys(hash)
      frame << keys.length
      pack << "N"
      keys.each do |k|
        val = deep_get(hash,k)
        key_length = k.bytesize
        val_length = val.bytesize
        frame << key_length
        pack << "N"
        frame << k
        pack << "A#{key_length}"
        frame << val_length
        pack << "N"
        frame << val
        pack << "A#{val_length}"
      end
      frame.pack(pack)
    end

    private
    def self.deep_get(hash, key="")
      return hash if key.nil?
      deep_get(
        hash[key.split('.').first],
        key[key.split('.').first.length+1..key.length]
      )
    end
    private
    def self.deep_keys(hash, prefix="")
      keys = []
      hash.each do |k,v|
        keys << "#{prefix}#{k}" if v.class == String
        keys << deep_keys(hash[k], "#{k}.") if v.class == Hash
      end
      keys.flatten
    end
  end # module Encoder
end
