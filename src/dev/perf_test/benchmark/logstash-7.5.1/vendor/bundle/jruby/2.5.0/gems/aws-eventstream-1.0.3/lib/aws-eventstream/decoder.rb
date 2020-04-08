require 'stringio'
require 'tempfile'
require 'zlib'

module Aws
  module EventStream 

    # This class provides method for decoding binary inputs into
    # single or multiple messages (Aws::EventStream::Message).
    #
    # * {#decode} - decodes messages from an IO like object responds
    #   to #read that containing binary data, returning decoded
    #   Aws::EventStream::Message along the way or wrapped in an enumerator
    #
    # ## Examples
    #
    #   decoder = Aws::EventStream::Decoder.new
    #
    #   # decoding from IO
    #   decoder.decode(io) do |message|
    #     message.headers
    #     # => { ... }
    #     message.payload
    #     # => StringIO / Tempfile
    #   end
    #
    #   # alternatively
    #   message_pool = decoder.decode(io)
    #   message_pool.next
    #   # => Aws::EventStream::Message
    #   
    # * {#decode_chunk} - decodes a single message from a chunk of data,
    #   returning message object followed by boolean(indicating eof status
    #   of data) in an array object
    #
    # ## Examples
    #
    #   # chunk containing exactly one message data
    #   message, chunk_eof = decoder.decode_chunk(chunk_str)
    #   message
    #   # => Aws::EventStream::Message
    #   chunk_eof
    #   # => true
    #
    #   # chunk containing a partial message
    #   message, chunk_eof = decoder.decode_chunk(chunk_str)
    #   message
    #   # => nil
    #   chunk_eof
    #   # => true
    #   # chunk data is saved at decoder's message_buffer
    #
    #   # chunk containing more that one data message
    #   message, chunk_eof = decoder.decode_chunk(chunk_str)
    #   message
    #   # => Aws::EventStream::Message
    #   chunk_eof
    #   # => false
    #   # extra chunk data is saved at message_buffer of the decoder
    #
    class Decoder

      include Enumerable

      ONE_MEGABYTE = 1024 * 1024

      # bytes of prelude part, including 4 bytes of
      # total message length, headers length and crc checksum of prelude
      PRELUDE_LENGTH = 12

      # bytes of total overhead in a message, including prelude
      # and 4 bytes total message crc checksum
      OVERHEAD_LENGTH = 16

      # @options options [Boolean] format (true) When `false`
      #   disable user-friendly formatting for message header values
      #   including timestamp and uuid etc.
      #
      def initialize(options = {})
        @format = options.fetch(:format, true)
        @message_buffer = BytesBuffer.new('')
      end

      # @returns [BytesBuffer]
      attr_reader :message_buffer

      # Decodes messages from a binary stream
      #
      # @param [IO#read] io An IO-like object
      #   that responds to `#read`
      #
      # @yieldparam [Message] message
      # @return [Enumerable<Message>, nil] Returns a new Enumerable
      #   containing decoded messages if no block is given
      def decode(io, &block)
        io = BytesBuffer.new(io.read)
        return decode_io(io) unless block_given?
        until io.eof?
          # fetch message only
          yield(decode_message(io).first)
        end
      end

      # Decodes a single message from a chunk of string
      #
      # @param [String] chunk A chunk of string to be decoded,
      #   chunk can contain partial event message to multiple event messages
      #   When not provided, decode data from #message_buffer
      #
      # @return [Array<Message|nil, Boolean>] Returns single decoded message
      #   and boolean pair, the boolean flag indicates whether this chunk
      #   has been fully consumed, unused data is tracked at #message_buffer
      def decode_chunk(chunk = nil)
        @message_buffer.write(chunk) if chunk
        @message_buffer.rewind
        decode_message(@message_buffer)
      end

      private

      def decode_io(io)
        ::Enumerator.new {|e| e << decode_message(io) unless io.eof? }
      end

      def decode_message(io)
        # incomplete message prelude received, leave it in the buffer
        return [nil, true] if io.bytesize < PRELUDE_LENGTH

        # decode prelude
        total_len, headers_len, prelude_buffer = prelude(io)

        # incomplete message received, leave it in the buffer
        return [nil, true] if io.bytesize < total_len

        # decode headers and payload
        headers, payload = context(io, total_len, headers_len, prelude_buffer)

        # track extra message data in the buffer if exists
        # for #decode_chunk, io is @message_buffer
        if eof = io.eof?
          @message_buffer.clear!
        else
          @message_buffer = BytesBuffer.new(@message_buffer.read)
        end

        [Message.new(headers: headers, payload: payload), eof]
      end

      def prelude(io)
        # buffer prelude into bytes buffer
        # prelude contains length of message and headers,
        # followed with CRC checksum of itself
        buffer = BytesBuffer.new(io.read(PRELUDE_LENGTH))

        # prelude checksum takes last 4 bytes
        checksum = Zlib.crc32(buffer.read(PRELUDE_LENGTH - 4))
        unless checksum == unpack_uint32(buffer)
          raise Errors::PreludeChecksumError
        end

        buffer.rewind
        total_len, headers_len, _ = buffer.read.unpack('N*')
        [total_len, headers_len, buffer]
      end

      def context(io, total_len, headers_len, prelude_buffer)
        # buffer rest of the message except prelude length
        # including context and total message checksum
        buffer = BytesBuffer.new(io.read(total_len - PRELUDE_LENGTH))
        context_len = total_len - OVERHEAD_LENGTH

        prelude_buffer.rewind
        checksum = Zlib.crc32(prelude_buffer.read << buffer.read(context_len))
        unless checksum == unpack_uint32(buffer)
          raise Errors::MessageChecksumError
        end

        buffer.rewind
        [
          extract_headers(BytesBuffer.new(buffer.read(headers_len))),
          extract_payload(BytesBuffer.new(buffer.read(context_len - headers_len)))
        ]
      end

      def extract_headers(buffer)
        headers = {}
        until buffer.eof?
          # header key
          key_len = unpack_uint8(buffer)
          key = buffer.read(key_len)

          # header value
          value_type = Types.types[unpack_uint8(buffer)]
          unpack_pattern, value_len, _ = Types.pattern[value_type]
          if !!unpack_pattern == unpack_pattern
            # boolean types won't have value specified
            value = unpack_pattern
          else
            value_len = unpack_uint16(buffer) unless value_len
            value = unpack_pattern ?
              buffer.read(value_len).unpack(unpack_pattern)[0] :
              buffer.read(value_len)
          end

          headers[key] = HeaderValue.new(
            format: @format,
            value: value,
            type: value_type
          )
        end
        headers
      end

      def extract_payload(buffer)
        buffer.bytesize <= ONE_MEGABYTE ?
          payload_stringio(buffer) :
          payload_tempfile(buffer)
      end

      def payload_stringio(buffer)
        StringIO.new(buffer.read)
      end

      def payload_tempfile(buffer)
        payload = Tempfile.new
        payload.binmode
        until buffer.eof?
          payload.write(buffer.read(ONE_MEGABYTE))
        end
        payload.rewind
        payload
      end

      # overhead decode helpers

      def unpack_uint32(buffer)
        buffer.read(4).unpack('N')[0]
      end

      def unpack_uint16(buffer)
        buffer.read(2).unpack('S>')[0]
      end

      def unpack_uint8(buffer)
        buffer.readbyte.unpack('C')[0]
      end
    end

  end
end
