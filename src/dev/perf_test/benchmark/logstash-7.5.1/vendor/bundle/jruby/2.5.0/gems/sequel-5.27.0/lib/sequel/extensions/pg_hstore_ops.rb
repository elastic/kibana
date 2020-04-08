# frozen-string-literal: true
#
# The pg_hstore_ops extension adds support to Sequel's DSL to make
# it easier to call PostgreSQL hstore functions and operators.
#
# To load the extension:
#
#   Sequel.extension :pg_hstore_ops
#
# The most common usage is taking an object that represents an SQL
# expression (such as a :symbol), and calling Sequel.hstore_op with it:
#
#   h = Sequel.hstore_op(:hstore_column)
#
# If you have also loaded the pg_hstore extension, you can use
# Sequel.hstore as well:
#
#   h = Sequel.hstore(:hstore_column)
#
# Also, on most Sequel expression objects, you can call the hstore 
# method:
#
#   h = Sequel[:hstore_column].hstore
#
# If you have loaded the {core_extensions extension}[rdoc-ref:doc/core_extensions.rdoc],
# or you have loaded the core_refinements extension
# and have activated refinements for the file, you can also use Symbol#hstore:
#
#   h = :hstore_column.hstore
#
# This creates a Sequel::Postgres::HStoreOp object that can be used
# for easier querying:
#
#   h - 'a'    # hstore_column - CAST('a' AS text)
#   h['a']     # hstore_column -> 'a'
#
#   h.concat(:other_hstore_column)       # ||
#   h.has_key?('a')                      # ?
#   h.contain_all(:array_column)         # ?&
#   h.contain_any(:array_column)         # ?|
#   h.contains(:other_hstore_column)     # @> 
#   h.contained_by(:other_hstore_column) # <@
#
#   h.defined        # defined(hstore_column)
#   h.delete('a')    # delete(hstore_column, 'a')
#   h.each           # each(hstore_column)
#   h.keys           # akeys(hstore_column)
#   h.populate(:a)   # populate_record(a, hstore_column)
#   h.record_set(:a) # (a #= hstore_column)
#   h.skeys          # skeys(hstore_column)
#   h.slice(:a)      # slice(hstore_column, a)
#   h.svals          # svals(hstore_column)
#   h.to_array       # hstore_to_array(hstore_column)
#   h.to_matrix      # hstore_to_matrix(hstore_column)
#   h.values         # avals(hstore_column)
#
# Here are a couple examples for updating an existing hstore column:
#
#   # Add a key, or update an existing key with a new value
#   DB[:tab].update(h: Sequel.hstore_op(:h).concat('c'=>3))
# 
#   # Delete a key
#   DB[:tab].update(h: Sequel.hstore_op(:h).delete('k1'))
#  
# See the PostgreSQL hstore function and operator documentation for more
# details on what these functions and operators do.
#
# If you are also using the pg_hstore extension, you should load it before
# loading this extension.  Doing so will allow you to use HStore#op to get
# an HStoreOp, allowing you to perform hstore operations on hstore literals.
#
# Some of these methods will accept ruby arrays and convert them automatically to
# PostgreSQL arrays if you have the pg_array extension loaded.  Some of these methods
# will accept ruby hashes and convert them automatically to PostgreSQL hstores if the
# pg_hstore extension is loaded.  Methods representing expressions that return
# PostgreSQL arrays will have the returned expression automatically wrapped in a
# Postgres::ArrayOp if the pg_array_ops extension is loaded.
#
# Related module: Sequel::Postgres::HStoreOp

#
module Sequel
  module Postgres
    # The HStoreOp class is a simple container for a single object that
    # defines methods that yield Sequel expression objects representing
    # PostgreSQL hstore operators and functions.
    #
    # In the method documentation examples, assume that:
    #
    #   hstore_op = :hstore.hstore
    class HStoreOp < Sequel::SQL::Wrapper
      CONCAT = ["(".freeze, " || ".freeze, ")".freeze].freeze
      CONTAIN_ALL = ["(".freeze, " ?& ".freeze, ")".freeze].freeze
      CONTAIN_ANY = ["(".freeze, " ?| ".freeze, ")".freeze].freeze
      CONTAINS = ["(".freeze, " @> ".freeze, ")".freeze].freeze
      CONTAINED_BY = ["(".freeze, " <@ ".freeze, ")".freeze].freeze
      HAS_KEY = ["(".freeze, " ? ".freeze, ")".freeze].freeze
      LOOKUP = ["(".freeze, " -> ".freeze, ")".freeze].freeze
      RECORD_SET = ["(".freeze, " #= ".freeze, ")".freeze].freeze

      # Delete entries from an hstore using the subtraction operator:
      #
      #   hstore_op - 'a' # (hstore - 'a')
      def -(other)
        other = if other.is_a?(String) && !other.is_a?(Sequel::LiteralString)
          Sequel.cast_string(other)
        else
          wrap_input_array(wrap_input_hash(other))
        end
        HStoreOp.new(super)
      end

      # Lookup the value for the given key in an hstore:
      #
      #   hstore_op['a'] # (hstore -> 'a')
      def [](key)
        v = Sequel::SQL::PlaceholderLiteralString.new(LOOKUP, [value, wrap_input_array(key)])
        if key.is_a?(Array) || (defined?(Sequel::Postgres::PGArray) && key.is_a?(Sequel::Postgres::PGArray)) || (defined?(Sequel::Postgres::ArrayOp) && key.is_a?(Sequel::Postgres::ArrayOp))
          wrap_output_array(v)
        else
          Sequel::SQL::StringExpression.new(:NOOP, v)
        end
      end

      # Check if the receiver contains all of the keys in the given array:
      #
      #   hstore_op.contain_all(:a) # (hstore ?& a)
      def contain_all(other)
        bool_op(CONTAIN_ALL, wrap_input_array(other))
      end

      # Check if the receiver contains any of the keys in the given array:
      #
      #   hstore_op.contain_any(:a) # (hstore ?| a)
      def contain_any(other)
        bool_op(CONTAIN_ANY, wrap_input_array(other))
      end

      # Check if the receiver contains all entries in the other hstore:
      #
      #   hstore_op.contains(:h) # (hstore @> h)
      def contains(other)
        bool_op(CONTAINS, wrap_input_hash(other))
      end

      # Check if the other hstore contains all entries in the receiver:
      #
      #   hstore_op.contained_by(:h) # (hstore <@ h)
      def contained_by(other)
        bool_op(CONTAINED_BY, wrap_input_hash(other))
      end

      # Check if the receiver contains a non-NULL value for the given key:
      #
      #   hstore_op.defined('a') # defined(hstore, 'a')
      def defined(key)
        Sequel::SQL::BooleanExpression.new(:NOOP, function(:defined, key))
      end

      # Delete the matching entries from the receiver:
      #
      #   hstore_op.delete('a') # delete(hstore, 'a')
      def delete(key)
        HStoreOp.new(function(:delete, wrap_input_array(wrap_input_hash(key))))
      end

      # Transform the receiver into a set of keys and values:
      #
      #   hstore_op.each # each(hstore)
      def each
        function(:each)
      end

      # Check if the receiver contains the given key:
      #
      #   hstore_op.has_key?('a') # (hstore ? 'a')
      def has_key?(key)
        bool_op(HAS_KEY, key)
      end
      alias include? has_key?
      alias key? has_key?
      alias member? has_key?
      alias exist? has_key?

      # Return the receiver.
      def hstore
        self
      end

      # Return the keys as a PostgreSQL array:
      #
      #   hstore_op.keys # akeys(hstore)
      def keys
        wrap_output_array(function(:akeys))
      end
      alias akeys keys

      # Merge a given hstore into the receiver:
      #
      #   hstore_op.merge(:a) # (hstore || a)
      def merge(other)
        HStoreOp.new(Sequel::SQL::PlaceholderLiteralString.new(CONCAT, [self, wrap_input_hash(other)]))
      end
      alias concat merge

      # Create a new record populated with entries from the receiver:
      #
      #   hstore_op.populate(:a) # populate_record(a, hstore)
      def populate(record)
        SQL::Function.new(:populate_record, record, self)
      end
      
      # Update the values in a record using entries in the receiver:
      #
      #   hstore_op.record_set(:a) # (a #= hstore)
      def record_set(record)
        Sequel::SQL::PlaceholderLiteralString.new(RECORD_SET, [record, value])
      end

      # Return the keys as a PostgreSQL set:
      #
      #   hstore_op.skeys # skeys(hstore)
      def skeys
        function(:skeys)
      end

      # Return an hstore with only the keys in the given array:
      #
      #   hstore_op.slice(:a) # slice(hstore, a)
      def slice(keys)
        HStoreOp.new(function(:slice, wrap_input_array(keys)))
      end

      # Return the values as a PostgreSQL set:
      #
      #   hstore_op.svals # svals(hstore)
      def svals
        function(:svals)
      end

      # Return a flattened array of the receiver with alternating
      # keys and values:
      #
      #   hstore_op.to_array # hstore_to_array(hstore)
      def to_array
        wrap_output_array(function(:hstore_to_array))
      end

      # Return a nested array of the receiver, with arrays of
      # 2 element (key/value) arrays:
      #
      #   hstore_op.to_matrix # hstore_to_matrix(hstore)
      def to_matrix
        wrap_output_array(function(:hstore_to_matrix))
      end

      # Return the values as a PostgreSQL array:
      #
      #   hstore_op.values # avals(hstore)
      def values
        wrap_output_array(function(:avals))
      end
      alias avals values

      private

      # Return a placeholder literal with the given str and args, wrapped
      # in a boolean expression, used by operators that return booleans.
      def bool_op(str, other)
        Sequel::SQL::BooleanExpression.new(:NOOP, Sequel::SQL::PlaceholderLiteralString.new(str, [value, other]))
      end

      # Return a function with the given name, and the receiver as the first
      # argument, with any additional arguments given.
      def function(name, *args)
        SQL::Function.new(name, self, *args)
      end

      # Wrap argument in a PGArray if it is an array
      def wrap_input_array(obj)
        if obj.is_a?(Array) && Sequel.respond_to?(:pg_array) 
          Sequel.pg_array(obj)
        else
          obj
        end
      end

      # Wrap argument in an Hstore if it is a hash
      def wrap_input_hash(obj)
        if obj.is_a?(Hash) && Sequel.respond_to?(:hstore) 
          Sequel.hstore(obj)
        else
          obj
        end
      end

      # Wrap argument in a PGArrayOp if supported
      def wrap_output_array(obj)
        if Sequel.respond_to?(:pg_array_op) 
          Sequel.pg_array_op(obj)
        else
          obj
        end
      end
    end

    module HStoreOpMethods
      # Wrap the receiver in an HStoreOp so you can easily use the PostgreSQL
      # hstore functions and operators with it.
      def hstore
        HStoreOp.new(self)
      end
    end

    if defined?(HStore)
      class HStore
        # Wrap the receiver in an HStoreOp so you can easily use the PostgreSQL
        # hstore functions and operators with it.
        def op
          HStoreOp.new(self)
        end
      end
    end
  end

  module SQL::Builders
    # Return the object wrapped in an Postgres::HStoreOp.
    def hstore_op(v)
      case v
      when Postgres::HStoreOp
        v
      else
        Postgres::HStoreOp.new(v)
      end
    end
  end

  class SQL::GenericExpression
    include Sequel::Postgres::HStoreOpMethods
  end

  class LiteralString
    include Sequel::Postgres::HStoreOpMethods
  end
end

# :nocov:
if Sequel.core_extensions?
  class Symbol
    include Sequel::Postgres::HStoreOpMethods
  end
end

if defined?(Sequel::CoreRefinements)
  module Sequel::CoreRefinements
    refine Symbol do
      include Sequel::Postgres::HStoreOpMethods
    end
  end
end
# :nocov:
