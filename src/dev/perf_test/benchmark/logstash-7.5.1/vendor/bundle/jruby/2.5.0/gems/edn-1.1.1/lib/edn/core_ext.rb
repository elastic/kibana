require 'time'
require 'bigdecimal'
require 'set'

module EDN
  module CoreExt
    module Unquoted
      def to_edn
        self.to_s
      end
    end

    module AllowsMetadata
      def allows_metadata?
        true
      end
    end

    module Bignum
      def to_edn
        self.to_s + 'M'
      end
    end

    module BigDecimal
      def to_edn
        self.to_s('F') + 'M'
      end
    end

    module String
      def ~@
        EDN::Type::Symbol.new(self)
      end

      def to_edn
        array = chars.map do |ch|
          if %w{" \\}.include?(ch)
            '\\' + ch
          else
            ch
          end
        end
        '"' + array.join + '"'
      end
    end

    module Symbol
      def to_edn
        ":#{self.to_s}"
      end
    end

    module Array
      def ~@
        EDN::Type::List.new(*self)
      end

      def to_edn
        '[' + self.map(&:to_edn).join(" ") + ']'
      end
    end

    module Hash
      def to_edn
        '{' + self.map { |k, v| [k, v].map(&:to_edn).join(" ") }.join(", ") + '}'
      end
    end

    module Set
      def to_edn
        '#{' + self.to_a.map(&:to_edn).join(" ") + '}'
      end
    end

    module NilClass
      def to_edn
        "nil"
      end
    end

    module DateTime
      def to_edn
        EDN.tagout("inst", self.rfc3339)
      end
    end

    module Time
      def to_edn
        EDN.tagout("inst", self.xmlschema)
      end
    end
  end
end

Numeric.send(:include, EDN::CoreExt::Unquoted)
Bignum.send(:include, EDN::CoreExt::Bignum)
BigDecimal.send(:include, EDN::CoreExt::BigDecimal)
TrueClass.send(:include, EDN::CoreExt::Unquoted)
FalseClass.send(:include, EDN::CoreExt::Unquoted)
NilClass.send(:include, EDN::CoreExt::NilClass)
String.send(:include, EDN::CoreExt::String)
Symbol.send(:include, EDN::CoreExt::Symbol)
Array.send(:include, EDN::CoreExt::Array)
Hash.send(:include, EDN::CoreExt::Hash)
Set.send(:include, EDN::CoreExt::Set)
DateTime.send(:include, EDN::CoreExt::DateTime)
Time.send(:include, EDN::CoreExt::Time)

[Array, Hash, Set].each do |klass|
  klass.send(:include, EDN::CoreExt::AllowsMetadata)
end
