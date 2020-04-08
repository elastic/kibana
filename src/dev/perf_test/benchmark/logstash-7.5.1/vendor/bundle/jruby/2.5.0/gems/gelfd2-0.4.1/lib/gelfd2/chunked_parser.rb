module Gelfd2
  class ChunkedParser
    class << self

      attr_accessor :message_id, :max_chunks, :decoded_data, :chunks, :seen

      def parse(data)
        @chunk_map ||= Hash.new { |hash, key| hash[key] = { total_chunks: 0, msg_ttl: 0, chunks: {} } }
        @msg_timeout ||= 20
        @last_cleanup ||= 0
        msg_id = parse_chunk(data)
        return unless @chunk_map[msg_id][:chunks].size == @chunk_map[msg_id][:total_chunks]
        cleanup_chunks
        assemble_chunks(msg_id)
      end

      def assemble_chunks(msg_id)
        buff = ''
        chunks = @chunk_map[msg_id][:chunks]
        chunks.keys.sort.each do |k|
          buff += chunks[k]
        end
        begin
          # TODO
          # This has a chance for an DoS
          # you can send a chunked message as a chunked message
          t = Parser.parse(buff.clone)
          @chunk_map.delete(msg_id)
          t
        rescue Exception => e
          "Exception: #{e.message}"
        end
      end

      def parse_chunk(data)
        header = data[0..1]
        raise NotChunkedDataError, "This doesn't look like a Chunked GELF message!" if header != CHUNKED_MAGIC
        begin
          msg_id = data[2..9].unpack('C*').join
          seq_number, total_number = data[10].ord, data[11].ord
          zlib_chunk = data[12..-1]
          raise TooManyChunksError, "#{total_number} greater than #{MAX_CHUNKS}" if total_number > MAX_CHUNKS
          @chunk_map[msg_id][:total_chunks] = total_number.to_i
          @chunk_map[msg_id][:chunks][seq_number.to_i] = zlib_chunk
          @chunk_map[msg_id][:ttl] = Time.now.to_i + @msg_timeout
          msg_id
        end
      end

      def cleanup_chunks
        # Run check every @msg_timeout seconds
        now = Time.now.to_i
        return unless now > @last_cleanup + @msg_timeout
        begin
          @last_cleanup = now
          @chunk_map.each do |msg_id, msg|
            next if msg[:ttl] > now
            @chunk_map.delete(msg_id)
          end
        end
      end
    end
  end
end
