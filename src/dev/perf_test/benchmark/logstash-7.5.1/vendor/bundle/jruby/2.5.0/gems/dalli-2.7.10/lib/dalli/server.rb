# frozen_string_literal: true
require 'socket'
require 'timeout'

module Dalli
  class Server
    attr_accessor :hostname
    attr_accessor :port
    attr_accessor :weight
    attr_accessor :options
    attr_reader :sock
    attr_reader :socket_type  # possible values: :unix, :tcp

    DEFAULT_PORT = 11211
    DEFAULT_WEIGHT = 1
    DEFAULTS = {
      # seconds between trying to contact a remote server
      :down_retry_delay => 60,
      # connect/read/write timeout for socket operations
      :socket_timeout => 0.5,
      # times a socket operation may fail before considering the server dead
      :socket_max_failures => 2,
      # amount of time to sleep between retries when a failure occurs
      :socket_failure_delay => 0.01,
      # max size of value in bytes (default is 1 MB, can be overriden with "memcached -I <size>")
      :value_max_bytes => 1024 * 1024,
      # surpassing value_max_bytes either warns (false) or throws (true)
      :error_when_over_max_size => false,
      :compressor => Compressor,
      # min byte size to attempt compression
      :compression_min_size => 1024,
      # max byte size for compression
      :compression_max_size => false,
      :serializer => Marshal,
      :username => nil,
      :password => nil,
      :keepalive => true,
      # max byte size for SO_SNDBUF
      :sndbuf => nil,
      # max byte size for SO_RCVBUF
      :rcvbuf => nil
    }

    def initialize(attribs, options = {})
      @hostname, @port, @weight, @socket_type = parse_hostname(attribs)
      @fail_count = 0
      @down_at = nil
      @last_down_at = nil
      @options = DEFAULTS.merge(options)
      @sock = nil
      @msg = nil
      @error = nil
      @pid = nil
      @inprogress = nil
    end

    def name
      if socket_type == :unix
        hostname
      else
        "#{hostname}:#{port}"
      end
    end

    # Chokepoint method for instrumentation
    def request(op, *args)
      verify_state
      raise Dalli::NetworkError, "#{name} is down: #{@error} #{@msg}. If you are sure it is running, ensure memcached version is > 1.4." unless alive?
      begin
        send(op, *args)
      rescue Dalli::MarshalError => ex
        Dalli.logger.error "Marshalling error for key '#{args.first}': #{ex.message}"
        Dalli.logger.error "You are trying to cache a Ruby object which cannot be serialized to memcached."
        Dalli.logger.error ex.backtrace.join("\n\t")
        false
      rescue Dalli::DalliError, Dalli::NetworkError, Dalli::ValueOverMaxSize, Timeout::Error
        raise
      rescue => ex
        Dalli.logger.error "Unexpected exception during Dalli request: #{ex.class.name}: #{ex.message}"
        Dalli.logger.error ex.backtrace.join("\n\t")
        down!
      end
    end

    def alive?
      return true if @sock

      if @last_down_at && @last_down_at + options[:down_retry_delay] >= Time.now
        time = @last_down_at + options[:down_retry_delay] - Time.now
        Dalli.logger.debug { "down_retry_delay not reached for #{name} (%.3f seconds left)" % time }
        return false
      end

      connect
      !!@sock
    rescue Dalli::NetworkError
      false
    end

    def close
      return unless @sock
      @sock.close rescue nil
      @sock = nil
      @pid = nil
      @inprogress = false
    end

    def lock!
    end

    def unlock!
    end

    def serializer
      @options[:serializer]
    end

    def compressor
      @options[:compressor]
    end

    # Start reading key/value pairs from this connection. This is usually called
    # after a series of GETKQ commands. A NOOP is sent, and the server begins
    # flushing responses for kv pairs that were found.
    #
    # Returns nothing.
    def multi_response_start
      verify_state
      write_noop
      @multi_buffer = String.new('')
      @position = 0
      @inprogress = true
    end

    # Did the last call to #multi_response_start complete successfully?
    def multi_response_completed?
      @multi_buffer.nil?
    end

    # Attempt to receive and parse as many key/value pairs as possible
    # from this server. After #multi_response_start, this should be invoked
    # repeatedly whenever this server's socket is readable until
    # #multi_response_completed?.
    #
    # Returns a Hash of kv pairs received.
    def multi_response_nonblock
      raise 'multi_response has completed' if @multi_buffer.nil?

      @multi_buffer << @sock.read_available
      buf = @multi_buffer
      pos = @position
      values = {}

      while buf.bytesize - pos >= 24
        header = buf.slice(pos, 24)
        (key_length, _, body_length, cas) = header.unpack(KV_HEADER)

        if key_length == 0
          # all done!
          @multi_buffer = nil
          @position = nil
          @inprogress = false
          break

        elsif buf.bytesize - pos >= 24 + body_length
          flags = buf.slice(pos + 24, 4).unpack('N')[0]
          key = buf.slice(pos + 24 + 4, key_length)
          value = buf.slice(pos + 24 + 4 + key_length, body_length - key_length - 4) if body_length - key_length - 4 > 0

          pos = pos + 24 + body_length

          begin
            values[key] = [deserialize(value, flags), cas]
          rescue DalliError
          end

        else
          # not enough data yet, wait for more
          break
        end
      end
      @position = pos

      values
    rescue SystemCallError, Timeout::Error, EOFError => e
      failure!(e)
    end

    # Abort an earlier #multi_response_start. Used to signal an external
    # timeout. The underlying socket is disconnected, and the exception is
    # swallowed.
    #
    # Returns nothing.
    def multi_response_abort
      @multi_buffer = nil
      @position = nil
      @inprogress = false
      failure!(RuntimeError.new('External timeout'))
    rescue NetworkError
      true
    end

    # NOTE: Additional public methods should be overridden in Dalli::Threadsafe

    private

    def verify_state
      failure!(RuntimeError.new('Already writing to socket')) if @inprogress
      if @pid && @pid != Process.pid
        message = 'Fork detected, re-connecting child process...'
        Dalli.logger.info { message }
        reconnect! message
      end
    end

    def reconnect!(message)
      close
      sleep(options[:socket_failure_delay]) if options[:socket_failure_delay]
      raise Dalli::NetworkError, message
    end

    def failure!(exception)
      message = "#{name} failed (count: #{@fail_count}) #{exception.class}: #{exception.message}"
      Dalli.logger.warn { message }

      @fail_count += 1
      if @fail_count >= options[:socket_max_failures]
        down!
      else
        reconnect! 'Socket operation failed, retrying...'
      end
    end

    def down!
      close

      @last_down_at = Time.now

      if @down_at
        time = Time.now - @down_at
        Dalli.logger.debug { "#{name} is still down (for %.3f seconds now)" % time }
      else
        @down_at = @last_down_at
        Dalli.logger.warn { "#{name} is down" }
      end

      @error = $! && $!.class.name
      @msg = @msg || ($! && $!.message && !$!.message.empty? && $!.message)
      raise Dalli::NetworkError, "#{name} is down: #{@error} #{@msg}"
    end

    def up!
      if @down_at
        time = Time.now - @down_at
        Dalli.logger.warn { "#{name} is back (downtime was %.3f seconds)" % time }
      end

      @fail_count = 0
      @down_at = nil
      @last_down_at = nil
      @msg = nil
      @error = nil
    end

    def multi?
      Thread.current[:dalli_multi]
    end

    def get(key, options=nil)
      req = [REQUEST, OPCODES[:get], key.bytesize, 0, 0, 0, key.bytesize, 0, 0, key].pack(FORMAT[:get])
      write(req)
      generic_response(true, !!(options && options.is_a?(Hash) && options[:cache_nils]))
    end

    def send_multiget(keys)
      req = String.new("")
      keys.each do |key|
        req << [REQUEST, OPCODES[:getkq], key.bytesize, 0, 0, 0, key.bytesize, 0, 0, key].pack(FORMAT[:getkq])
      end
      # Could send noop here instead of in multi_response_start
      write(req)
    end

    def set(key, value, ttl, cas, options)
      (value, flags) = serialize(key, value, options)
      ttl = sanitize_ttl(ttl)

      guard_max_value(key, value) do
        req = [REQUEST, OPCODES[multi? ? :setq : :set], key.bytesize, 8, 0, 0, value.bytesize + key.bytesize + 8, 0, cas, flags, ttl, key, value].pack(FORMAT[:set])
        write(req)
        cas_response unless multi?
      end
    end

    def add(key, value, ttl, options)
      (value, flags) = serialize(key, value, options)
      ttl = sanitize_ttl(ttl)

      guard_max_value(key, value) do
        req = [REQUEST, OPCODES[multi? ? :addq : :add], key.bytesize, 8, 0, 0, value.bytesize + key.bytesize + 8, 0, 0, flags, ttl, key, value].pack(FORMAT[:add])
        write(req)
        cas_response unless multi?
      end
    end

    def replace(key, value, ttl, cas, options)
      (value, flags) = serialize(key, value, options)
      ttl = sanitize_ttl(ttl)

      guard_max_value(key, value) do
        req = [REQUEST, OPCODES[multi? ? :replaceq : :replace], key.bytesize, 8, 0, 0, value.bytesize + key.bytesize + 8, 0, cas, flags, ttl, key, value].pack(FORMAT[:replace])
        write(req)
        cas_response unless multi?
      end
    end

    def delete(key, cas)
      req = [REQUEST, OPCODES[multi? ? :deleteq : :delete], key.bytesize, 0, 0, 0, key.bytesize, 0, cas, key].pack(FORMAT[:delete])
      write(req)
      generic_response unless multi?
    end

    def flush(ttl)
      req = [REQUEST, OPCODES[:flush], 0, 4, 0, 0, 4, 0, 0, 0].pack(FORMAT[:flush])
      write(req)
      generic_response
    end

    def decr_incr(opcode, key, count, ttl, default)
      expiry = default ? sanitize_ttl(ttl) : 0xFFFFFFFF
      default ||= 0
      (h, l) = split(count)
      (dh, dl) = split(default)
      req = [REQUEST, OPCODES[opcode], key.bytesize, 20, 0, 0, key.bytesize + 20, 0, 0, h, l, dh, dl, expiry, key].pack(FORMAT[opcode])
      write(req)
      body = generic_response
      body ? body.unpack('Q>').first : body
    end

    def decr(key, count, ttl, default)
      decr_incr :decr, key, count, ttl, default
    end

    def incr(key, count, ttl, default)
      decr_incr :incr, key, count, ttl, default
    end

    def write_append_prepend(opcode, key, value)
      write_generic [REQUEST, OPCODES[opcode], key.bytesize, 0, 0, 0, value.bytesize + key.bytesize, 0, 0, key, value].pack(FORMAT[opcode])
    end

    def write_generic(bytes)
      write(bytes)
      generic_response
    end

    def write_noop
      req = [REQUEST, OPCODES[:noop], 0, 0, 0, 0, 0, 0, 0].pack(FORMAT[:noop])
      write(req)
    end

    # Noop is a keepalive operation but also used to demarcate the end of a set of pipelined commands.
    # We need to read all the responses at once.
    def noop
      write_noop
      multi_response
    end

    def append(key, value)
      write_append_prepend :append, key, value
    end

    def prepend(key, value)
      write_append_prepend :prepend, key, value
    end

    def stats(info='')
      req = [REQUEST, OPCODES[:stat], info.bytesize, 0, 0, 0, info.bytesize, 0, 0, info].pack(FORMAT[:stat])
      write(req)
      keyvalue_response
    end

    def reset_stats
      write_generic [REQUEST, OPCODES[:stat], 'reset'.bytesize, 0, 0, 0, 'reset'.bytesize, 0, 0, 'reset'].pack(FORMAT[:stat])
    end

    def cas(key)
      req = [REQUEST, OPCODES[:get], key.bytesize, 0, 0, 0, key.bytesize, 0, 0, key].pack(FORMAT[:get])
      write(req)
      data_cas_response
    end

    def version
      write_generic [REQUEST, OPCODES[:version], 0, 0, 0, 0, 0, 0, 0].pack(FORMAT[:noop])
    end

    def touch(key, ttl)
      ttl = sanitize_ttl(ttl)
      write_generic [REQUEST, OPCODES[:touch], key.bytesize, 4, 0, 0, key.bytesize + 4, 0, 0, ttl, key].pack(FORMAT[:touch])
    end

    # http://www.hjp.at/zettel/m/memcached_flags.rxml
    # Looks like most clients use bit 0 to indicate native language serialization
    # and bit 1 to indicate gzip compression.
    FLAG_SERIALIZED = 0x1
    FLAG_COMPRESSED = 0x2

    def serialize(key, value, options=nil)
      marshalled = false
      value = unless options && options[:raw]
        marshalled = true
        begin
          self.serializer.dump(value)
        rescue Timeout::Error => e
          raise e
        rescue => ex
          # Marshalling can throw several different types of generic Ruby exceptions.
          # Convert to a specific exception so we can special case it higher up the stack.
          exc = Dalli::MarshalError.new(ex.message)
          exc.set_backtrace ex.backtrace
          raise exc
        end
      else
        value.to_s
      end
      compressed = false
      set_compress_option = true if options && options[:compress]
      if (@options[:compress] || set_compress_option) && value.bytesize >= @options[:compression_min_size] &&
        (!@options[:compression_max_size] || value.bytesize <= @options[:compression_max_size])
        value = self.compressor.compress(value)
        compressed = true
      end

      flags = 0
      flags |= FLAG_COMPRESSED if compressed
      flags |= FLAG_SERIALIZED if marshalled
      [value, flags]
    end

    def deserialize(value, flags)
      value = self.compressor.decompress(value) if (flags & FLAG_COMPRESSED) != 0
      value = self.serializer.load(value) if (flags & FLAG_SERIALIZED) != 0
      value
    rescue TypeError
      raise if $!.message !~ /needs to have method `_load'|exception class\/object expected|instance of IO needed|incompatible marshal file format/
      raise UnmarshalError, "Unable to unmarshal value: #{$!.message}"
    rescue ArgumentError
      raise if $!.message !~ /undefined class|marshal data too short/
      raise UnmarshalError, "Unable to unmarshal value: #{$!.message}"
    rescue Zlib::Error
      raise UnmarshalError, "Unable to uncompress value: #{$!.message}"
    end

    def data_cas_response
      (extras, _, status, count, _, cas) = read_header.unpack(CAS_HEADER)
      data = read(count) if count > 0
      if status == 1
        nil
      elsif status != 0
        raise Dalli::DalliError, "Response error #{status}: #{RESPONSE_CODES[status]}"
      elsif data
        flags = data[0...extras].unpack('N')[0]
        value = data[extras..-1]
        data = deserialize(value, flags)
      end
      [data, cas]
    end

    CAS_HEADER = '@4CCnNNQ'
    NORMAL_HEADER = '@4CCnN'
    KV_HEADER = '@2n@6nN@16Q'

    def guard_max_value(key, value)
      if value.bytesize <= @options[:value_max_bytes]
        yield
      else
        message = "Value for #{key} over max size: #{@options[:value_max_bytes]} <= #{value.bytesize}"
        raise Dalli::ValueOverMaxSize, message if @options[:error_when_over_max_size]

        Dalli.logger.error "#{message} - this value may be truncated by memcached"
        false
      end
    end

    # https://github.com/memcached/memcached/blob/master/doc/protocol.txt#L79
    # > An expiration time, in seconds. Can be up to 30 days. After 30 days, is treated as a unix timestamp of an exact date.
    MAX_ACCEPTABLE_EXPIRATION_INTERVAL = 30*24*60*60 # 30 days
    def sanitize_ttl(ttl)
      ttl_as_i = ttl.to_i
      return ttl_as_i if ttl_as_i <= MAX_ACCEPTABLE_EXPIRATION_INTERVAL
      now = Time.now.to_i
      return ttl_as_i if ttl_as_i > now # already a timestamp
      Dalli.logger.debug "Expiration interval (#{ttl_as_i}) too long for Memcached, converting to an expiration timestamp"
      now + ttl_as_i
    end

    # Implements the NullObject pattern to store an application-defined value for 'Key not found' responses.
    class NilObject; end
    NOT_FOUND = NilObject.new

    def generic_response(unpack=false, cache_nils=false)
      (extras, _, status, count) = read_header.unpack(NORMAL_HEADER)
      data = read(count) if count > 0
      if status == 1
        cache_nils ? NOT_FOUND : nil
      elsif status == 2 || status == 5
        false # Not stored, normal status for add operation
      elsif status != 0
        raise Dalli::DalliError, "Response error #{status}: #{RESPONSE_CODES[status]}"
      elsif data
        flags = data[0...extras].unpack('N')[0]
        value = data[extras..-1]
        unpack ? deserialize(value, flags) : value
      else
        true
      end
    end

    def cas_response
      (_, _, status, count, _, cas) = read_header.unpack(CAS_HEADER)
      read(count) if count > 0  # this is potential data that we don't care about
      if status == 1
        nil
      elsif status == 2 || status == 5
        false # Not stored, normal status for add operation
      elsif status != 0
        raise Dalli::DalliError, "Response error #{status}: #{RESPONSE_CODES[status]}"
      else
        cas
      end
    end

    def keyvalue_response
      hash = {}
      while true
        (key_length, _, body_length, _) = read_header.unpack(KV_HEADER)
        return hash if key_length == 0
        key = read(key_length)
        value = read(body_length - key_length) if body_length - key_length > 0
        hash[key] = value
      end
    end

    def multi_response
      hash = {}
      while true
        (key_length, _, body_length, _) = read_header.unpack(KV_HEADER)
        return hash if key_length == 0
        flags = read(4).unpack('N')[0]
        key = read(key_length)
        value = read(body_length - key_length - 4) if body_length - key_length - 4 > 0
        hash[key] = deserialize(value, flags)
      end
    end

    def write(bytes)
      begin
        @inprogress = true
        result = @sock.write(bytes)
        @inprogress = false
        result
      rescue SystemCallError, Timeout::Error => e
        failure!(e)
      end
    end

    def read(count)
      begin
        @inprogress = true
        data = @sock.readfull(count)
        @inprogress = false
        data
      rescue SystemCallError, Timeout::Error, EOFError => e
        failure!(e)
      end
    end

    def read_header
      read(24) || raise(Dalli::NetworkError, 'No response')
    end

    def connect
      Dalli.logger.debug { "Dalli::Server#connect #{name}" }

      begin
        @pid = Process.pid
        if socket_type == :unix
          @sock = KSocket::UNIX.open(hostname, self, options)
        else
          @sock = KSocket::TCP.open(hostname, port, self, options)
        end
        sasl_authentication if need_auth?
        @version = version # trigger actual connect
        up!
      rescue Dalli::DalliError # SASL auth failure
        raise
      rescue SystemCallError, Timeout::Error, EOFError, SocketError => e
        # SocketError = DNS resolution failure
        failure!(e)
      end
    end

    def split(n)
      [n >> 32, 0xFFFFFFFF & n]
    end

    REQUEST = 0x80
    RESPONSE = 0x81

    # Response codes taken from:
    # https://github.com/memcached/memcached/wiki/BinaryProtocolRevamped#response-status
    RESPONSE_CODES = {
      0 => 'No error',
      1 => 'Key not found',
      2 => 'Key exists',
      3 => 'Value too large',
      4 => 'Invalid arguments',
      5 => 'Item not stored',
      6 => 'Incr/decr on a non-numeric value',
      7 => 'The vbucket belongs to another server',
      8 => 'Authentication error',
      9 => 'Authentication continue',
      0x20 => 'Authentication required',
      0x81 => 'Unknown command',
      0x82 => 'Out of memory',
      0x83 => 'Not supported',
      0x84 => 'Internal error',
      0x85 => 'Busy',
      0x86 => 'Temporary failure'
    }

    OPCODES = {
      :get => 0x00,
      :set => 0x01,
      :add => 0x02,
      :replace => 0x03,
      :delete => 0x04,
      :incr => 0x05,
      :decr => 0x06,
      :flush => 0x08,
      :noop => 0x0A,
      :version => 0x0B,
      :getkq => 0x0D,
      :append => 0x0E,
      :prepend => 0x0F,
      :stat => 0x10,
      :setq => 0x11,
      :addq => 0x12,
      :replaceq => 0x13,
      :deleteq => 0x14,
      :incrq => 0x15,
      :decrq => 0x16,
      :auth_negotiation => 0x20,
      :auth_request => 0x21,
      :auth_continue => 0x22,
      :touch => 0x1C,
    }

    HEADER = "CCnCCnNNQ"
    OP_FORMAT = {
      :get => 'a*',
      :set => 'NNa*a*',
      :add => 'NNa*a*',
      :replace => 'NNa*a*',
      :delete => 'a*',
      :incr => 'NNNNNa*',
      :decr => 'NNNNNa*',
      :flush => 'N',
      :noop => '',
      :getkq => 'a*',
      :version => '',
      :stat => 'a*',
      :append => 'a*a*',
      :prepend => 'a*a*',
      :auth_request => 'a*a*',
      :auth_continue => 'a*a*',
      :touch => 'Na*',
    }
    FORMAT = OP_FORMAT.inject({}) { |memo, (k, v)| memo[k] = HEADER + v; memo }


    #######
    # SASL authentication support for NorthScale
    #######

    def need_auth?
      @options[:username] || ENV['MEMCACHE_USERNAME']
    end

    def username
      @options[:username] || ENV['MEMCACHE_USERNAME']
    end

    def password
      @options[:password] || ENV['MEMCACHE_PASSWORD']
    end

    def sasl_authentication
      Dalli.logger.info { "Dalli/SASL authenticating as #{username}" }

      # negotiate
      req = [REQUEST, OPCODES[:auth_negotiation], 0, 0, 0, 0, 0, 0, 0].pack(FORMAT[:noop])
      write(req)

      (extras, _type, status, count) = read_header.unpack(NORMAL_HEADER)
      raise Dalli::NetworkError, "Unexpected message format: #{extras} #{count}" unless extras == 0 && count > 0
      content = read(count).gsub(/\u0000/, ' ')
      return (Dalli.logger.debug("Authentication not required/supported by server")) if status == 0x81
      mechanisms = content.split(' ')
      raise NotImplementedError, "Dalli only supports the PLAIN authentication mechanism" if !mechanisms.include?('PLAIN')

      # request
      mechanism = 'PLAIN'
      msg = "\x0#{username}\x0#{password}"
      req = [REQUEST, OPCODES[:auth_request], mechanism.bytesize, 0, 0, 0, mechanism.bytesize + msg.bytesize, 0, 0, mechanism, msg].pack(FORMAT[:auth_request])
      write(req)

      (extras, _type, status, count) = read_header.unpack(NORMAL_HEADER)
      raise Dalli::NetworkError, "Unexpected message format: #{extras} #{count}" unless extras == 0 && count > 0
      content = read(count)
      return Dalli.logger.info("Dalli/SASL: #{content}") if status == 0

      raise Dalli::DalliError, "Error authenticating: #{status}" unless status == 0x21
      raise NotImplementedError, "No two-step authentication mechanisms supported"
      # (step, msg) = sasl.receive('challenge', content)
      # raise Dalli::NetworkError, "Authentication failed" if sasl.failed? || step != 'response'
    end

    def parse_hostname(str)
      res = str.match(/\A(\[([\h:]+)\]|[^:]+)(?::(\d+))?(?::(\d+))?\z/)
      raise Dalli::DalliError, "Could not parse hostname #{str}" if res.nil? || res[1] == '[]'
      hostnam = res[2] || res[1]
      if hostnam =~ /\A\//
        socket_type = :unix
        # in case of unix socket, allow only setting of weight, not port
        raise Dalli::DalliError, "Could not parse hostname #{str}" if res[4]
        weigh = res[3]
      else
        socket_type = :tcp
        por = res[3] || DEFAULT_PORT
        por = Integer(por)
        weigh = res[4]
      end
      weigh ||= DEFAULT_WEIGHT
      weigh = Integer(weigh)
      return hostnam, por, weigh, socket_type
    end
  end
end
