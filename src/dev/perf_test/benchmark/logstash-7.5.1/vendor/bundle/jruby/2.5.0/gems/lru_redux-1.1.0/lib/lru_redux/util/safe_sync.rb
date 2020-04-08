require 'monitor'

module LruRedux
  module Util
    module SafeSync
      include MonitorMixin

      def initialize(*args)
        super(*args)
      end

      def max_size=(max_size)
        synchronize do
          super(max_size)
        end
      end

      def ttl=(ttl)
        synchronize do
          super(ttl)
        end
      end

      def getset(key)
        synchronize do
          super(key)
        end
      end

      def fetch(key)
        synchronize do
          super(key)
        end
      end

      def [](key)
        synchronize do
          super(key)
        end
      end

      def []=(key, value)
        synchronize do
          super(key, value)
        end
      end

      def each
        synchronize do
          super
        end
      end

      def to_a
        synchronize do
          super
        end
      end

      def delete(key)
        synchronize do
          super(key)
        end
      end

      def evict(key)
        synchronize do
          super(key)
        end
      end

      def key?(key)
        synchronize do
          super(key)
        end
      end

      def has_key?(key)
        synchronize do
          super(key)
        end
      end

      def clear
        synchronize do
          super
        end
      end

      def count
        synchronize do
          super
        end
      end

      def valid?
        synchronize do
          super
        end
      end
    end
  end
end
