module EDN
  module Type
    class Unknown < Struct.new(:tag, :value)
      def to_edn
        EDN.tagout(tag, value)
      end
    end
  end
end
