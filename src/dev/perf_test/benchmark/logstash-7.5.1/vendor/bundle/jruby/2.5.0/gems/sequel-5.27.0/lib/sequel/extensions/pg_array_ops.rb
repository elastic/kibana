# frozen-string-literal: true
#
# The pg_array_ops extension adds support to Sequel's DSL to make
# it easier to call PostgreSQL array functions and operators.
#
# To load the extension:
#
#   Sequel.extension :pg_array_ops
#
# The most common usage is passing an expression to Sequel.pg_array_op:
#
#   ia = Sequel.pg_array_op(:int_array_column)
#
# If you have also loaded the pg_array extension, you can use
# Sequel.pg_array as well:
#
#   ia = Sequel.pg_array(:int_array_column)
#
# Also, on most Sequel expression objects, you can call the pg_array
# method:
#
#   ia = Sequel[:int_array_column].pg_array
#
# If you have loaded the {core_extensions extension}[rdoc-ref:doc/core_extensions.rdoc],
# or you have loaded the core_refinements extension
# and have activated refinements for the file, you can also use Symbol#pg_array:
#
#   ia = :int_array_column.pg_array
#
# This creates a Sequel::Postgres::ArrayOp object that can be used
# for easier querying:
#
#   ia[1]     # int_array_column[1]
#   ia[1][2]  # int_array_column[1][2]
#
#   ia.contains(:other_int_array_column)     # @> 
#   ia.contained_by(:other_int_array_column) # <@
#   ia.overlaps(:other_int_array_column)     # &&
#   ia.concat(:other_int_array_column)       # ||
#
#   ia.push(1)         # int_array_column || 1
#   ia.unshift(1)      # 1 || int_array_column
#
#   ia.any             # ANY(int_array_column)
#   ia.all             # ALL(int_array_column)
#   ia.cardinality     # cardinality(int_array_column)
#   ia.dims            # array_dims(int_array_column)
#   ia.hstore          # hstore(int_array_column)
#   ia.hstore(:a)      # hstore(int_array_column, a)
#   ia.length          # array_length(int_array_column, 1)
#   ia.length(2)       # array_length(int_array_column, 2)
#   ia.lower           # array_lower(int_array_column, 1)
#   ia.lower(2)        # array_lower(int_array_column, 2)
#   ia.join            # array_to_string(int_array_column, '')
#   ia.join(':')       # array_to_string(int_array_column, ':')
#   ia.join(':', ' ')  # array_to_string(int_array_column, ':', ' ')
#   ia.unnest          # unnest(int_array_column)
#   ia.unnest(:b)      # unnest(int_array_column, b)
# 
# See the PostgreSQL array function and operator documentation for more
# details on what these functions and operators do.
#
# If you are also using the pg_array extension, you should load it before
# loading this extension.  Doing so will allow you to use PGArray#op to get
# an ArrayOp, allowing you to perform array operations on array literals.
#
# In order for #hstore to automatically wrap the returned value correctly in
# an HStoreOp, you need to load the pg_hstore_ops extension.
#
# Related module: Sequel::Postgres::ArrayOp

#
module Sequel
  module Postgres
    # The ArrayOp class is a simple container for a single object that
    # defines methods that yield Sequel expression objects representing
    # PostgreSQL array operators and functions.
    #
    # In the method documentation examples, assume that:
    #
    #   array_op = :array.pg_array
    class ArrayOp < Sequel::SQL::Wrapper
      CONCAT = ["(".freeze, " || ".freeze, ")".freeze].freeze
      CONTAINS = ["(".freeze, " @> ".freeze, ")".freeze].freeze
      CONTAINED_BY = ["(".freeze, " <@ ".freeze, ")".freeze].freeze
      OVERLAPS = ["(".freeze, " && ".freeze, ")".freeze].freeze

      # Access a member of the array, returns an SQL::Subscript instance:
      #
      #   array_op[1] # array[1]
      def [](key)
        s = Sequel::SQL::Subscript.new(self, [key])
        s = ArrayOp.new(s) if key.is_a?(Range)
        s
      end

      # Call the ALL function:
      #
      #   array_op.all # ALL(array)
      #
      # Usually used like:
      #
      #   dataset.where(1=>array_op.all)
      #   # WHERE (1 = ALL(array))
      def all
        function(:ALL)
      end

      # Call the ANY function:
      #
      #   array_op.all # ANY(array)
      #
      # Usually used like:
      #
      #   dataset.where(1=>array_op.any)
      #   # WHERE (1 = ANY(array))
      def any
        function(:ANY)
      end

      # Call the cardinality method:
      #
      #   array_op.cardinality # cardinality(array)
      def cardinality
        function(:cardinality)
      end

      # Use the contains (@>) operator:
      #
      #   array_op.contains(:a) # (array @> a)
      def contains(other)
        bool_op(CONTAINS, wrap_array(other))
      end

      # Use the contained by (<@) operator:
      #
      #   array_op.contained_by(:a) # (array <@ a)
      def contained_by(other)
        bool_op(CONTAINED_BY, wrap_array(other))
      end

      # Call the array_dims method:
      #
      #   array_op.dims # array_dims(array)
      def dims
        function(:array_dims)
      end

      # Convert the array into an hstore using the hstore function.
      # If given an argument, use the two array form:
      #
      #   array_op.hstore          # hstore(array)
      #   array_op.hstore(:array2) # hstore(array, array2)
      def hstore(arg=(no_arg_given=true; nil))
        v = if no_arg_given
          Sequel.function(:hstore, self)
        else
          Sequel.function(:hstore, self, wrap_array(arg))
        end
        if Sequel.respond_to?(:hstore_op)
          v = Sequel.hstore_op(v)
        end
        v
      end

      # Call the array_length method:
      #
      #   array_op.length    # array_length(array, 1)
      #   array_op.length(2) # array_length(array, 2)
      def length(dimension = 1)
        function(:array_length, dimension)
      end
      
      # Call the array_lower method:
      #
      #   array_op.lower    # array_lower(array, 1)
      #   array_op.lower(2) # array_lower(array, 2)
      def lower(dimension = 1)
        function(:array_lower, dimension)
      end
      
      # Use the overlaps (&&) operator:
      #
      #   array_op.overlaps(:a) # (array && a)
      def overlaps(other)
        bool_op(OVERLAPS, wrap_array(other))
      end

      # Use the concatentation (||) operator:
      #
      #   array_op.push(:a) # (array || a)
      #   array_op.concat(:a) # (array || a)
      def push(other)
        array_op(CONCAT, [self, wrap_array(other)])
      end
      alias concat push

      # Return the receiver.
      def pg_array
        self
      end

      # Remove the given element from the array:
      #
      #   array_op.remove(1) # array_remove(array, 1)
      def remove(element)
        ArrayOp.new(function(:array_remove, element))
      end

      # Replace the given element in the array with another
      # element:
      #
      #   array_op.replace(1, 2) # array_replace(array, 1, 2)
      def replace(element, replacement)
        ArrayOp.new(function(:array_replace, element, replacement))
      end

      # Call the array_to_string method:
      #
      #   array_op.join           # array_to_string(array, '')
      #   array_op.to_string      # array_to_string(array, '')
      #   array_op.join(":")      # array_to_string(array, ':')
      #   array_op.join(":", "*") # array_to_string(array, ':', '*')
      def to_string(joiner="", null=nil)
        if null.nil?
          function(:array_to_string, joiner)
        else
          function(:array_to_string, joiner, null)
        end
      end
      alias join to_string
      
      # Call the unnest method:
      #
      #   array_op.unnest # unnest(array)
      def unnest(*args)
        function(:unnest, *args.map{|a| wrap_array(a)})
      end
      
      # Use the concatentation (||) operator, reversing the order:
      #
      #   array_op.unshift(:a) # (a || array)
      def unshift(other)
        array_op(CONCAT, [wrap_array(other), self])
      end

      private

      # Return a placeholder literal with the given str and args, wrapped
      # in an ArrayOp, used by operators that return arrays.
      def array_op(str, args)
        ArrayOp.new(Sequel::SQL::PlaceholderLiteralString.new(str, args))
      end

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

      # Automatically wrap argument in a PGArray if it is a plain Array.
      # Requires that the pg_array extension has been loaded to work.
      def wrap_array(arg)
        if arg.instance_of?(Array)
          Sequel.pg_array(arg)
        else
          arg
        end
      end
    end

    module ArrayOpMethods
      # Wrap the receiver in an ArrayOp so you can easily use the PostgreSQL
      # array functions and operators with it.
      def pg_array
        ArrayOp.new(self)
      end
    end

    if defined?(PGArray)
      class PGArray
        # Wrap the PGArray instance in an ArrayOp, allowing you to easily use
        # the PostgreSQL array functions and operators with literal arrays.
        def op
          ArrayOp.new(self)
        end
      end
    end
  end

  module SQL::Builders
    # Return the object wrapped in an Postgres::ArrayOp.
    def pg_array_op(v)
      case v
      when Postgres::ArrayOp
        v
      else
        Postgres::ArrayOp.new(v)
      end
    end
  end

  class SQL::GenericExpression
    include Sequel::Postgres::ArrayOpMethods
  end

  class LiteralString
    include Sequel::Postgres::ArrayOpMethods
  end
end

# :nocov:
if Sequel.core_extensions?
  class Symbol
    include Sequel::Postgres::ArrayOpMethods
  end
end

if defined?(Sequel::CoreRefinements)
  module Sequel::CoreRefinements
    refine Symbol do
      include Sequel::Postgres::ArrayOpMethods
    end
  end
end
# :nocov:
