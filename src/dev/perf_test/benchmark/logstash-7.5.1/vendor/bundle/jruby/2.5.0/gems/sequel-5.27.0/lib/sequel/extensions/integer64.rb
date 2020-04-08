# frozen-string-literal: true
#
# The integer64 extension changes the default type used for Integer
# to be the same type as used for :Bignum.  In general, this means that
# instead of Integer resulting in a 32-bit database integer type, it will
# result in a 64-bit database integer type.  This affects the default
# type used for primary_key and foreign_key when using the schema
# modification methods.
#
# Note that it doesn't make sense to use this extension on SQLite, since
# the integer type will automatically handle 64-bit integers, and it treats
# the integer type specially when the column is also the primary key.
# 
# To load the extension into the database:
#
#   DB.extension :integer64
#
# Related module: Sequel::Integer64

#
module Sequel
  module Integer64
    # Use same type as used for :Bignum by default for generic integer value.
    def type_literal_generic_integer(column)
      type_literal_generic_bignum_symbol(column)
    end
  end

  Database.register_extension(:integer64, Integer64)
end
