require 'zlib'

module Aws
  module EventStream 

    # This class provides #encode method for encoding
    # Aws::EventStream::Message into binary.
    #
    # * {#encode} - encode Aws::EventStream::Message into binary
    #   when output IO-like object is provided, binary string
    #   would be written to IO. If not, the encoded binary string
    #   would be returned directly
    #
    # ## Examples
    #
    #   message = Aws::EventStream::Message.new(
    #     headers: {
    #       "foo" => Aws::EventStream::HeaderValue.new(
    #         value: "bar", type: "string"
    #        )
    #     },
    #     payload: "payload"
    #   )
    #   encoder = Aws::EventsStream::Encoder.new
    #   file = Tempfile.new
    #
    #   # encode into IO ouput
    #   encoder.encode(message, file)
    #
    #   # get encoded binary string
    #   encoded_message = encoder.encode(message)
    #
    #   file.read == encoded_message
    #   # => true
    #
    class Encoder

      # bytes of total overhead in a message, including prelude
      # and 4 bytes total message crc checksum
      OVERHEAD_LENGTH = 16

      # Maximum header length allowed (after encode) 128kb
      MAX_HEADERS_LENGTH = 131072

      # Maximum payload length allowed (after encode) 16mb
      MAX_PAYLOAD_LENGTH = 16777216

      # Encodes Aws::EventStream::Message to output IO when
      #   provided, else return the encoded binary string
      #
      # @param [Aws::EventStream::Message] message
      #
      # @param [IO#write, nil] io An IO-like object that
      #   responds to `#write`, encoded message will be
      #   written to this IO when provided
      #
      # @return [nil, String] when output IO is provided,
      #   encoded message will be written to that IO, nil
      #   will be returned. Else, encoded binary string is
      #   returned.
      def encode(message, io = nil)
        encoded = encode_message(message).read
        if io
          io.write(encoded)
          io.close
        else
          encoded
        end
      end

      # Encodes an Aws::EventStream::Message
      #   into Aws::EventStream::BytesBuffer
      #
      # @param [Aws::EventStream::Message] msg
      #
      # @return [Aws::EventStream::BytesBuffer]
      def encode_message(message)
        # create context buffer with encode headers
        ctx_buffer = encode_headers(message)
        headers_len = ctx_buffer.bytesize
        # encode payload
        if message.payload.length > MAX_PAYLOAD_LENGTH
          raise Aws::EventStream::Errors::EventPayloadLengthExceedError.new
        end
        ctx_buffer << message.payload.read
        total_len = ctx_buffer.bytesize + OVERHEAD_LENGTH

        # create message buffer with prelude section
        buffer = prelude(total_len, headers_len)

        # append message context (headers, payload)
        buffer << ctx_buffer.read
        # append message checksum
        buffer << pack_uint32(Zlib.crc32(buffer.read))

        # write buffered message to io
        buffer.rewind
        buffer
      end

      # Encodes headers part of an Aws::EventStream::Message
      #   into Aws::EventStream::BytesBuffer
      #
      # @param [Aws::EventStream::Message] msg
      #
      # @return [Aws::EventStream::BytesBuffer]
      def encode_headers(msg)
        buffer = BytesBuffer.new('')
        msg.headers.each do |k, v|
          # header key
          buffer << pack_uint8(k.bytesize)
          buffer << k

          # header value
          pattern, val_len, idx = Types.pattern[v.type]
          buffer << pack_uint8(idx)
          # boolean types doesn't need to specify value
          next if !!pattern == pattern
          buffer << pack_uint16(v.value.bytesize) unless val_len
          pattern ? buffer << [v.value].pack(pattern) :
            buffer << v.value
        end
        if buffer.bytesize > MAX_HEADERS_LENGTH
          raise Aws::EventStream::Errors::EventHeadersLengthExceedError.new
        end
        buffer
      end

      private

      def prelude(total_len, headers_len)
        BytesBuffer.new(pack_uint32([
          total_len,
          headers_len,
          Zlib.crc32(pack_uint32([total_len, headers_len]))
        ]))
      end

      # overhead encode helpers

      def pack_uint8(val)
        [val].pack('C')
      end

      def pack_uint16(val)
        [val].pack('S>')
      end

      def pack_uint32(val)
        if val.respond_to?(:each)
          val.pack('N*')
        else
          [val].pack('N')
        end
      end

    end

  end
end
