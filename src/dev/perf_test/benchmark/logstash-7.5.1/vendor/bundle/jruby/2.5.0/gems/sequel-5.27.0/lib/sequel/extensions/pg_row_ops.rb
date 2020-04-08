# frozen-string-literal: true
#
# The pg_row_ops extension adds support to Sequel's DSL to make
# it easier to deal with PostgreSQL row-valued/composite types.
#
# To load the extension:
#
#   Sequel.extension :pg_row_ops
#
# The most common usage is passing an expression to Sequel.pg_row_op:
#
#   r = Sequel.pg_row_op(:row_column)
#
# If you have also loaded the pg_row extension, you can use
# Sequel.pg_row as well:
#
#   r = Sequel.pg_row(:row_column)
#
# Also, on most Sequel expression objects, you can call the pg_row
# method:
#
#   r = Sequel[:row_column].pg_row
#
# If you have loaded the {core_extensions extension}[rdoc-ref:doc/core_extensions.rdoc],
# or you have loaded the core_refinements extension
# and have activated refinements for the file, you can also use Symbol#pg_row:
#
#   r = :row_column.pg_row
#
# There's only fairly basic support currently.  You can use the [] method to access
# a member of the composite type:
#
#   r[:a] # (row_column).a
#
# This can be chained:
#
#   r[:a][:b] # ((row_column).a).b
#
# If you've loaded the pg_array_ops extension, you there is also support for composite
# types that include arrays, or arrays of composite types:
#
#   r[1][:a] # (row_column[1]).a
#   r[:a][1] # (row_column).a[1]
#
# The only other support is the splat method:
#
#   r.splat # (row_column.*)
#
# The splat method is necessary if you are trying to reference a table's type when the
# table has the same name as one of it's columns.  For example:
#
#   DB.create_table(:a){Integer :a; Integer :b}
#
# Let's say you want to reference the composite type for the table:
#
#   a = Sequel.pg_row_op(:a)
#   DB[:a].select(a[:b]) # SELECT (a).b FROM a
#
# Unfortunately, that doesn't work, as it references the integer column, not the table.
# The splat method works around this:
#
#   DB[:a].select(a.splat[:b]) # SELECT (a.*).b FROM a
#
# Splat also takes an argument which is used for casting.  This is necessary if you
# want to return the composite type itself, instead of the columns in the composite
# type.  For example:
#
#   DB[:a].select(a.splat).first # SELECT (a.*) FROM a
#   # => {:a=>1, :b=>2}
#
# By casting the expression, you can get a composite type returned:
#
#   DB[:a].select(a.splat(:a)).first # SELECT (a.*)::a FROM a
#   # => {:a=>"(1,2)"} # or {:a=>{:a=>1, :b=>2}} if the "a" type has been registered
#                      # with the pg_row extension
#
# This feature is mostly useful for a different way to graph tables:
#
#   DB[:a].join(:b, id: :b_id).select(Sequel.pg_row_op(:a).splat(:a),
#                                     Sequel.pg_row_op(:b).splat(:b))
#   # SELECT (a.*)::a, (b.*)::b FROM a INNER JOIN b ON (b.id = a.b_id)
#   # => {:a=>{:id=>1, :b_id=>2}, :b=>{:id=>2}}
#
# Related module: Sequel::Postgres::PGRowOp

#
module Sequel
  module Postgres
    # This class represents a composite type expression reference.
    class PGRowOp < SQL::PlaceholderLiteralString
      ROW = ['(', '.*)'].freeze.each(&:freeze)
      ROW_CAST = ['(', '.*)::'].freeze.each(&:freeze)
      QUALIFY = ['(', ').'].freeze.each(&:freeze)
      WRAP = [""].freeze.each(&:freeze)

      # Wrap the expression in a PGRowOp, without changing the
      # SQL it would use.
      def self.wrap(expr)
        PGRowOp.new(WRAP, [expr])
      end

      # Access a member of the composite type if given a
      # symbol or an SQL::Identifier.  For all other access,
      # assuming the pg_array_ops extension is loaded and
      # that it represents an array access.  In either
      # case, return a PgRowOp so that access can be cascaded.
      def [](member)
        case member
        when Symbol, SQL::Identifier
          PGRowOp.new(QUALIFY, [self, member])
        else
          PGRowOp.wrap(Sequel.pg_array_op(self)[member])
        end
      end

      # Use the (identifier).* syntax to reference the members
      # of the composite type as separate columns.  Generally
      # used when you want to expand the columns of a composite
      # type to be separate columns in the result set.
      #
      #   Sequel.pg_row_op(:a).*     # (a).*
      #   Sequel.pg_row_op(:a)[:b].* # ((a).b).*
      def *(ce=(arg=false;nil))
        if arg == false
          Sequel::SQL::ColumnAll.new([self])
        else
          super(ce)
        end
      end

      # Use the (identifier.*) syntax to indicate that this
      # expression represents the composite type of one
      # of the tables being referenced, if it has the same
      # name as one of the columns.  If the cast_to argument
      # is given, also cast the expression to that type
      # (which should be a symbol representing the composite type).
      # This is used if you want to return whole table row as a
      # composite type.
      #
      #   Sequel.pg_row_op(:a).splat[:b] # (a.*).b
      #   Sequel.pg_row_op(:a).splat(:a) # (a.*)::a
      def splat(cast_to=nil)
        if args.length > 1
          raise Error, 'cannot splat a PGRowOp with multiple arguments'
        end

        if cast_to
          PGRowOp.new(ROW_CAST, args + [cast_to])
        else
          PGRowOp.new(ROW, args)
        end
      end

      module ExpressionMethods
        # Return a PGRowOp wrapping the receiver.
        def pg_row
          Sequel.pg_row_op(self)
        end
      end
    end
  end

  module SQL::Builders
    # Return a PGRowOp wrapping the given expression.
    def pg_row_op(expr)
      Postgres::PGRowOp.wrap(expr)
    end
  end

  class SQL::GenericExpression
    include Sequel::Postgres::PGRowOp::ExpressionMethods
  end

  class LiteralString
    include Sequel::Postgres::PGRowOp::ExpressionMethods
  end
end

# :nocov:
if Sequel.core_extensions?
  class Symbol
    include Sequel::Postgres::PGRowOp::ExpressionMethods
  end
end

if defined?(Sequel::CoreRefinements)
  module Sequel::CoreRefinements
    refine Symbol do
      include Sequel::Postgres::PGRowOp::ExpressionMethods
    end
  end
end
# :nocov:
