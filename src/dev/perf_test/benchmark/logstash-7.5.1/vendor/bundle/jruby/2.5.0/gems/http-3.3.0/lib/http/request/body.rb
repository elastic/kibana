# frozen_string_literal: true

module HTTP
  class Request
    class Body
      attr_reader :source

      def initialize(source)
        @source = source

        validate_source_type!
      end

      # Returns size which should be used for the "Content-Length" header.
      #
      # @return [Integer]
      def size
        if @source.is_a?(String)
          @source.bytesize
        elsif @source.respond_to?(:read)
          raise RequestError, "IO object must respond to #size" unless @source.respond_to?(:size)
          @source.size
        elsif @source.nil?
          0
        else
          raise RequestError, "cannot determine size of body: #{@source.inspect}"
        end
      end

      # Yields chunks of content to be streamed to the request body.
      #
      # @yieldparam [String]
      def each(&block)
        if @source.is_a?(String)
          yield @source
        elsif @source.respond_to?(:read)
          IO.copy_stream(@source, ProcIO.new(block))
          @source.rewind if @source.respond_to?(:rewind)
        elsif @source.is_a?(Enumerable)
          @source.each(&block)
        end
      end

      private

      def validate_source_type!
        return if @source.is_a?(String)
        return if @source.respond_to?(:read)
        return if @source.is_a?(Enumerable)
        return if @source.nil?

        raise RequestError, "body of wrong type: #{@source.class}"
      end

      # This class provides a "writable IO" wrapper around a proc object, with
      # #write simply calling the proc, which we can pass in as the
      # "destination IO" in IO.copy_stream.
      class ProcIO
        def initialize(block)
          @block = block
        end

        def write(data)
          @block.call(data)
          data.bytesize
        end
      end
    end
  end
end
