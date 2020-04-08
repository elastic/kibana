module EDN
  module Type
    class UUID < String
      def to_edn
        "#uuid #{self.inspect}"
      end
    end
  end
end
