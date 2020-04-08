module Aws
  module EventStream 

    # @api private
    class BytesBuffer

      # This Util class is for Decoder/Encoder usage only
      # Not for public common bytes buffer usage
      def initialize(data)
        @data = data
        @pos = 0
      end

      def read(len = nil, offset = 0)
        return '' if len == 0 || bytesize == 0
        unless eof?
          start_byte = @pos + offset
          end_byte = len ?
            start_byte + len - 1 :
            bytesize - 1

          error = Errors::ReadBytesExceedLengthError.new(end_byte, bytesize)
          raise error if end_byte >= bytesize

          @pos = end_byte + 1
          @data[start_byte..end_byte]
        end
      end

      def readbyte
        unless eof?
          @pos += 1
          @data[@pos - 1]
        end
      end

      def write(bytes)
        @data <<= bytes
        bytes.bytesize
      end
      alias_method :<<, :write

      def rewind
        @pos = 0
      end

      def eof?
        @pos == bytesize
      end

      def bytesize
        @data.bytesize
      end

      def tell
        @pos
      end

      def clear!
        @data = ''
        @pos = 0
      end
    end

  end
end
