# encoding: utf-8
require "lumberjack"
require "socket"
require "thread"
require "openssl"
require "zlib"
require "json"
require "concurrent"

module Lumberjack
  class Server
    SOCKET_TIMEOUT = 1 # seconds

    attr_reader :port

    # Create a new Lumberjack server.
    #
    # - options is a hash. Valid options are:
    #
    # * :port - the port to listen on
    # * :address - the host/address to bind to
    # * :ssl_certificate - the path to the ssl cert to use
    # * :ssl_key - the path to the ssl key to use
    # * :ssl_key_passphrase - the key passphrase (optional)
    def initialize(options={})
      @options = {
        :port => 0,
        :address => "0.0.0.0",
        :ssl => true,
        :ssl_certificate => nil,
        :ssl_key => nil,
        :ssl_key_passphrase => nil
      }.merge(options)

      if @options[:ssl]
        [:ssl_certificate, :ssl_key].each do |k|
          if @options[k].nil?
            raise "You must specify #{k} in Lumberjack::Server.new(...)"
          end
        end
      end

      @server = TCPServer.new(@options[:address], @options[:port])

      @close = Concurrent::AtomicBoolean.new

      # Query the port in case the port number is '0'
      # TCPServer#addr == [ address_family, port, address, address ]
      @port = @server.addr[1]

      if @options[:ssl]
        # load SSL certificate
        @ssl = OpenSSL::SSL::SSLContext.new
        @ssl.cert = OpenSSL::X509::Certificate.new(File.read(@options[:ssl_certificate]))
        @ssl.key = OpenSSL::PKey::RSA.new(File.read(@options[:ssl_key]),
          @options[:ssl_key_passphrase])
      end
    end # def initialize

    def run(&block)
      while !closed?
        connection = accept

        # Some exception may occur in the accept loop
        # we will try again in the next iteration
        # unless the server is closing
        next unless connection

        Thread.new(connection) do |connection|
          connection.run(&block)
        end
      end
    end # def run

    def ssl?
      @ssl
    end

    def accept(&block)
      begin
        socket = @server.accept_nonblock
        # update the socket with a SSL layer
        socket = accept_ssl(socket) if ssl?

        if block_given?
          block.call(socket, self)
        else
          return Connection.new(socket, self)
        end
      rescue OpenSSL::SSL::SSLError, IOError, EOFError, Errno::EBADF
        socket.close rescue nil
        retry unless closed?
      rescue IO::WaitReadable, Errno::EAGAIN # Resource not ready yet, so lets try again
        begin
          IO.select([@server], nil, nil, SOCKET_TIMEOUT)
          retry unless closed?
        rescue IOError, Errno::EBADF => e # we currently closing
          raise e unless closed?
        end
      end
    end

    def accept_ssl(tcp_socket)
      ssl_socket = OpenSSL::SSL::SSLSocket.new(tcp_socket, @ssl)
      ssl_socket.sync_close

      begin
        ssl_socket.accept_nonblock

        return ssl_socket
      rescue IO::WaitReadable # handshake
        IO.select([ssl_socket], nil, nil, SOCKET_TIMEOUT)
        retry unless closed?
      rescue IO::WaitWritable # handshake
        IO.select(nil, [ssl_socket], nil, SOCKET_TIMEOUT)
        retry unless closed?
      end
    end

    def closed?
      @close.value
    end

    def close
      @close.make_true
      @server.close unless @server.closed?
    end
  end # class Server

  class Parser
    PROTOCOL_VERSION_1 = "1".ord
    PROTOCOL_VERSION_2 = "2".ord

    SUPPORTED_PROTOCOLS = [PROTOCOL_VERSION_1, PROTOCOL_VERSION_2]

    def initialize
      @buffer_offset = 0
      @buffer = ""
      @buffer.force_encoding("BINARY")
      transition(:header, 2)
    end # def initialize

    def transition(state, next_length)
      @state = state
      #puts :transition => state
      # TODO(sissel): Assert this self.respond_to?(state)
      # TODO(sissel): Assert state is in STATES
      # TODO(sissel): Assert next_length is a number
      need(next_length)
    end # def transition

    # Feed data to this parser.
    # 
    # Currently, it will return the raw payload of websocket messages.
    # Otherwise, it returns nil if no complete message has yet been consumed.
    #
    # @param [String] the string data to feed into the parser. 
    # @return [String, nil] the websocket message payload, if any, nil otherwise.
    def feed(data, &block)
      @buffer << data
      #p :need => @need
      while have?(@need)
        send(@state, &block) 
        #case @state
        #when :header; header(&block)
        #when :window_size; window_size(&block)
        #when :data_lead; data_lead(&block)
        #when :data_field_key_len; data_field_key_len(&block)
        #when :data_field_key; data_field_key(&block)
        #when :data_field_value_len; data_field_value_len(&block)
        #when :data_field_value; data_field_value(&block)
        #when :data_field_value; data_field_value(&block)
        #when :compressed_lead; compressed_lead(&block)
        #when :compressed_payload; compressed_payload(&block)
        #end # case @state
      end
      return nil
    end # def <<

    # Do we have at least 'length' bytes in the buffer?
    def have?(length)
      return length <= (@buffer.size - @buffer_offset)
    end # def have?

    # Get 'length' string from the buffer.
    def get(length=nil)
      length = @need if length.nil?
      data = @buffer[@buffer_offset ... @buffer_offset + length]
      @buffer_offset += length
      if @buffer_offset > 16384
        @buffer = @buffer[@buffer_offset  .. -1]
        @buffer_offset = 0
      end
      return data
    end # def get

    # Set the minimum number of bytes we need in the buffer for the next read.
    def need(length)
      @need = length
    end # def need

    FRAME_WINDOW = "W".ord
    FRAME_DATA = "D".ord
    FRAME_JSON_DATA = "J".ord
    FRAME_COMPRESSED = "C".ord
    def header(&block)
      version, frame_type = get.bytes.to_a[0..1]
      version ||= PROTOCOL_VERSION_1

      handle_version(version, &block)

      case frame_type
      when FRAME_WINDOW; transition(:window_size, 4)
      when FRAME_DATA; transition(:data_lead, 8)
      when FRAME_JSON_DATA; transition(:json_data_lead, 8)
      when FRAME_COMPRESSED; transition(:compressed_lead, 4)
      else; raise "Unknown frame type: `#{frame_type}`"
      end
    end

    def handle_version(version, &block)
      if supported_protocol?(version)
        yield :version, version
      else
        raise "unsupported protocol #{version}"
      end
    end

    def supported_protocol?(version)
      SUPPORTED_PROTOCOLS.include?(version)
    end

    def window_size(&block)
      @window_size = get.unpack("N").first
      transition(:header, 2)
      yield :window_size, @window_size
    end # def window_size

    def json_data_lead(&block)
      @sequence, payload_size = get.unpack("NN")
      transition(:json_data_payload, payload_size)
    end

    def json_data_payload(&block)
      payload = get
      yield :json, @sequence, Lumberjack::json.load(payload)
      transition(:header, 2)
    end

    def data_lead(&block)
      @sequence, @data_count = get.unpack("NN")
      @data = {}
      transition(:data_field_key_len, 4)
    end

    def data_field_key_len(&block)
      key_len = get.unpack("N").first
      transition(:data_field_key, key_len)
    end

    def data_field_key(&block)
      @key = get
      transition(:data_field_value_len, 4)
    end

    def data_field_value_len(&block)
      transition(:data_field_value, get.unpack("N").first)
    end

    def data_field_value(&block)
      @value = get

      @data_count -= 1
      @data[@key] = @value

      if @data_count > 0
        transition(:data_field_key_len, 4)
      else
        # emit the whole map now that we found the end of the data fields list.
        yield :data, @sequence, @data
        transition(:header, 2)
      end

    end # def data_field_value

    def compressed_lead(&block)
      length = get.unpack("N").first
      transition(:compressed_payload, length)
    end

    def compressed_payload(&block)
      original = Zlib::Inflate.inflate(get)
      transition(:header, 2)

      # Parse the uncompressed payload.
      feed(original, &block)
    end
  end # class Parser

  class Connection
    READ_SIZE = 16384

    attr_accessor :server

    def initialize(fd, server)
      @parser = Parser.new
      @fd = fd

      @server = server
      @ack_handler = nil
    end

    def run(&block)
      while !server.closed?
        read_socket(&block)
      end
    rescue EOFError, OpenSSL::SSL::SSLError, IOError, Errno::ECONNRESET
      # EOF or other read errors, only action is to shutdown which we'll do in
      # 'ensure'
    rescue Errno::EAGAIN
      retry unless server.closed?
    ensure
      close rescue 'Already closed stream'
    end # def run

    def read_socket(&block)
      # TODO(sissel): Ack on idle.
      # X: - if any unacked, IO.select
      # X:   - on timeout, ack all.
      # X: Doing so will prevent slow streams from retransmitting
      # X: too many events after errors.
      @parser.feed(@fd.sysread(READ_SIZE)) do |event, *args|
        case event
        when :version
          version(*args)
        when :window_size
          reset_next_ack(*args)
        when :data
          sequence, map = args
          ack_if_needed(sequence) { data(map, &block) }
        when :json
          # If the payload is an array of items we will emit multiple events
          # this behavior was moved from the plugin to the library.
          # see this commit: https://github.com/logstash-plugins/logstash-input-lumberjack/pull/57/files#diff-1b9590423b15f04f215635164e7376ecR158
          sequence, map = args

          ack_if_needed(sequence) do
            if map.is_a?(Array)
              map.each { |e| data(e, &block) }
            else
              data(map, &block)
            end
          end
        end
      end
    end

    def version(version)
      @version = version
    end

    def ack_if_needed(sequence, &block)
      block.call
      send_ack(sequence) if @ack_handler.ack?(sequence)
    end

    def close
      @fd.close unless @fd.closed?
    end

    def data(map, &block)
      block.call(map) if block_given?
    end

    def reset_next_ack(window_size)
      klass = (@version == Parser::PROTOCOL_VERSION_1) ? AckingProtocolV1 : AckingProtocolV2
      @ack_handler = klass.new(window_size)
    end

    def send_ack(sequence)
      @fd.syswrite(@ack_handler.ack_frame(sequence))
    end
  end # class Connection

  class AckingProtocolV1
    def initialize(window_size)
      @next_ack = nil
      @window_size = window_size
    end

    def ack?(sequence)
      # The first encoded event will contain the sequence number 
      # this is needed to know when we should ack.
      @next_ack = compute_next_ack(sequence) if @next_ack.nil?
      sequence == @next_ack
    end

    def ack_frame(sequence)
      ["1A", sequence].pack("A*N")
    end

    private
    def compute_next_ack(sequence)
      (sequence + @window_size - 1) % SEQUENCE_MAX
    end
  end

  # Allow lumberjack to send partial ack back to the producer
  # only V2 client support partial Acks
  #
  # Send Ack on every 20% of the data, so with default settings every 200 events
  # This should reduce the congestion on retransmit.
  class AckingProtocolV2
    ACK_RATIO = 5

    def initialize(window_size)
      @window_size = window_size
      @every = (window_size / ACK_RATIO).round
    end

    def ack?(sequence)
      if @window_size == sequence
        true
      elsif sequence % @every == 0
        true
      else
        false
      end
    end

    def ack_frame(sequence)
      ["2A", sequence].pack("A*N")
    end
  end
end # module Lumberjack
