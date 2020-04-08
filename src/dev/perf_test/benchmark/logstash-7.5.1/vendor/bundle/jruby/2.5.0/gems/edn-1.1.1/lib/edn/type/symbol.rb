module EDN
  module Type
    class Symbol
      include EDN::CoreExt::AllowsMetadata

      attr_reader :symbol

      def initialize(sym)
        @symbol = sym.to_sym
      end

      def ==(other)
        return false unless other.is_a?(Symbol)
        to_sym == other.to_sym
      end

      def eql?(other)
        return false unless other.is_a?(Symbol)
        to_sym == other.to_sym
      end

      def hash
        @symbol.hash
      end

      def to_sym
        @symbol
      end

      def to_s
        @symbol.to_s
      end

      def to_edn
        @symbol.to_s
      end
    end
  end
end
