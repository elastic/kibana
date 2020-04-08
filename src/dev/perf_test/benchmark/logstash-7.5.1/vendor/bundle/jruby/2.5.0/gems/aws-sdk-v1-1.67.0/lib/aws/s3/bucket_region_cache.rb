require 'thread'

module AWS
  class S3
    class BucketRegionCache

      def initialize
        @regions = {}
        @mutex = Mutex.new
      end

      def [](bucket_name)
        @mutex.synchronize do
          @regions[bucket_name]
        end
      end

      def []=(bucket_name, region_name)
        @mutex.synchronize do
          @regions[bucket_name] = region_name
        end
      end

      def delete(bucket_name)
        @mutex.synchronize do
          @regions[bucket_name] = region_name
        end
      end

      def update!(bucket_regions)
        @mutex.synchronize do
          @regions.update!(bucket_regions)
        end
      end

      def clear
        @mutex.synchronize do
          @regions = {}
        end
      end

      def to_hash
        @mutex.synchronize do
          @regions.dup
        end
      end
      alias to_h to_hash

    end
  end
end
