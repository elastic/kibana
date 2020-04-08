module LruRedux
  module Util
    module SafeSync
      def getset(key, &block)
        synchronize do
          super(key, &block)
        end
      end

      def fetch(key, &block)
        synchronize do
          super(key, &block)
        end
      end
    end
  end
end
