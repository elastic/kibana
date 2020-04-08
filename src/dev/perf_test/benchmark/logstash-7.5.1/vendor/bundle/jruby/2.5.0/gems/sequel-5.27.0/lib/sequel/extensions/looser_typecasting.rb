# frozen-string-literal: true
#
# The LooserTypecasting extension loosens the default database typecasting
# for the following types:
#
# :float :: use to_f instead of Float()
# :integer :: use to_i instead of Integer()
# :decimal :: use 0.0 for unsupported strings
# :string :: silently allow hash and array conversion to string
#
# To load the extension into the database:
#
#   DB.extension :looser_typecasting
#
# Related module: Sequel::LooserTypecasting

#
module Sequel
  module LooserTypecasting
    private

    # Typecast the value to a Float using to_f instead of Kernel.Float
    def typecast_value_float(value)
      value.to_f
    end

    # Typecast the value to an Integer using to_i instead of Kernel.Integer
    def typecast_value_integer(value)
      value.to_i
    end

    # Typecast the value to an String using to_s instead of Kernel.String
    def typecast_value_string(value)
      value.to_s
    end

    if RUBY_VERSION >= '2.4'
      def _typecast_value_string_to_decimal(value)
        BigDecimal(value)
      rescue
        BigDecimal('0.0')
      end
    else
      # :nocov:
      def _typecast_value_string_to_decimal(value)
        BigDecimal(value)
      end
      # :nocov:
    end
  end

  Database.register_extension(:looser_typecasting, LooserTypecasting)
end

