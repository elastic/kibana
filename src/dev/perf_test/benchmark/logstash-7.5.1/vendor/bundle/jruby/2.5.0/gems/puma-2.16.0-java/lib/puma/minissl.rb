module Puma
  module MiniSSL
    class Socket
      def initialize(socket, engine)
        @socket = socket
        @engine = engine
        @peercert = nil
      end

      def to_io
        @socket
      end

      def readpartial(size)
        while true
          output = @engine.read
          return output if output

          data = @socket.readpartial(size)
          @engine.inject(data)
          output = @engine.read

          return output if output

          while neg_data = @engine.extract
            @socket.write neg_data
          end
        end
      end

      def engine_read_all
        output = @engine.read
        while output and additional_output = @engine.read
          output << additional_output
        end
        output
      end

      def read_nonblock(size)
        while true
          output = engine_read_all
          return output if output

          data = @socket.read_nonblock(size)

          @engine.inject(data)
          output = engine_read_all

          return output if output

          while neg_data = @engine.extract
            @socket.write neg_data
          end
        end
      end

      def write(data)
        need = data.bytesize

        while true
          wrote = @engine.write data
          enc = @engine.extract

          while enc
            @socket.write enc
            enc = @engine.extract
          end

          need -= wrote

          return data.bytesize if need == 0

          data = data[wrote..-1]
        end
      end

      alias_method :syswrite, :write

      def flush
        @socket.flush
      end

      def close
        @socket.close
      end

      def peeraddr
        @socket.peeraddr
      end

      def peercert
        return @peercert if @peercert

        raw = @engine.peercert
        return nil unless raw

        @peercert = OpenSSL::X509::Certificate.new raw
      end
    end

    if defined?(JRUBY_VERSION)
      class SSLError < StandardError
        # Define this for jruby even though it isn't used.
      end

      def self.check; end
    end

    class Context
      attr_accessor :verify_mode

      if defined?(JRUBY_VERSION)
        # jruby-specific Context properties: java uses a keystore and password pair rather than a cert/key pair
        attr_reader :keystore
        attr_accessor :keystore_pass

        def keystore=(keystore)
          raise ArgumentError, "No such keystore file '#{keystore}'" unless File.exist? keystore
          @keystore = keystore
        end
      else
        # non-jruby Context properties
        attr_reader :key
        attr_reader :cert
        attr_reader :ca

        def key=(key)
          raise ArgumentError, "No such key file '#{key}'" unless File.exist? key
          @key = key
        end

        def cert=(cert)
          raise ArgumentError, "No such cert file '#{cert}'" unless File.exist? cert
          @cert = cert
        end

        def ca=(ca)
          raise ArgumentError, "No such ca file '#{ca}'" unless File.exist? ca
          @ca = ca
        end
      end
    end

    VERIFY_NONE = 0
    VERIFY_PEER = 1
    VERIFY_FAIL_IF_NO_PEER_CERT = 2

    class Server
      def initialize(socket, ctx)
        @socket = socket
        @ctx = ctx
      end

      def to_io
        @socket
      end

      def accept
        io = @socket.accept
        engine = Engine.server @ctx

        Socket.new io, engine
      end

      def accept_nonblock
        io = @socket.accept_nonblock
        engine = Engine.server @ctx

        Socket.new io, engine
      end

      def close
        @socket.close
      end
    end
  end
end
