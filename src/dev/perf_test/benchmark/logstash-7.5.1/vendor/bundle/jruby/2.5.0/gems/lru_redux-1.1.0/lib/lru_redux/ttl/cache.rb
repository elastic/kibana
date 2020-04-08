module LruRedux
  module TTL
    class Cache
      attr_reader :max_size, :ttl

      def initialize(*args)
        max_size, ttl = args

        ttl ||= :none

        raise ArgumentError.new(:max_size) if
            max_size < 1
        raise ArgumentError.new(:ttl) unless
            ttl == :none || ((ttl.is_a? Numeric) && ttl >= 0)

        @max_size = max_size
        @ttl = ttl
        @data_lru = {}
        @data_ttl = {}
      end

      def max_size=(max_size)
        max_size ||= @max_size

        raise ArgumentError.new(:max_size) if
            max_size < 1

        @max_size = max_size

        resize
      end

      def ttl=(ttl)
        ttl ||= @ttl

        raise ArgumentError.new(:ttl) unless
            ttl == :none || ((ttl.is_a? Numeric) && ttl >= 0)

        @ttl = ttl

        ttl_evict
      end

      def getset(key)
        ttl_evict

        found = true
        value = @data_lru.delete(key){ found = false }
        if found
          @data_lru[key] = value
        else
          result = @data_lru[key] = yield
          @data_ttl[key] = Time.now.to_f

          if @data_lru.size > @max_size
            key, _ = @data_lru.first

            @data_ttl.delete(key)
            @data_lru.delete(key)
          end

          result
        end
      end

      def fetch(key)
        ttl_evict

        found = true
        value = @data_lru.delete(key){ found = false }
        if found
          @data_lru[key] = value
        else
          yield if block_given?
        end
      end

      def [](key)
        ttl_evict

        found = true
        value = @data_lru.delete(key){ found = false }
        if found
          @data_lru[key] = value
        else
          nil
        end
      end

      def []=(key, val)
        ttl_evict

        @data_lru.delete(key)
        @data_ttl.delete(key)

        @data_lru[key] = val
        @data_ttl[key] = Time.now.to_f

        if @data_lru.size > @max_size
          key, _ = @data_lru.first

          @data_ttl.delete(key)
          @data_lru.delete(key)
        end

        val
      end

      def each
        ttl_evict

        array = @data_lru.to_a
        array.reverse!.each do |pair|
          yield pair
        end
      end

      # used further up the chain, non thread safe each
      alias_method :each_unsafe, :each

      def to_a
        ttl_evict

        array = @data_lru.to_a
        array.reverse!
      end

      def delete(key)
        ttl_evict

        @data_lru.delete(key)
        @data_ttl.delete(key)
      end

      alias_method :evict, :delete

      def key?(key)
        ttl_evict

        @data_lru.key?(key)
      end

      alias_method :has_key?, :key?

      def clear
        @data_lru.clear
        @data_ttl.clear
      end

      def expire
        ttl_evict
      end

      def count
        @data_lru.size
      end

      protected

      # for cache validation only, ensures all is sound
      def valid?
        @data_lru.size == @data_ttl.size
      end

      def ttl_evict
        return if @ttl == :none

        ttl_horizon = Time.now.to_f - @ttl
        key, time = @data_ttl.first

        until time.nil? || time > ttl_horizon
          @data_ttl.delete(key)
          @data_lru.delete(key)

          key, time = @data_ttl.first
        end
      end

      def resize
        ttl_evict

        while @data_lru.size > @max_size
          key, _ = @data_lru.first

          @data_ttl.delete(key)
          @data_lru.delete(key)
        end
      end
    end
  end
end

