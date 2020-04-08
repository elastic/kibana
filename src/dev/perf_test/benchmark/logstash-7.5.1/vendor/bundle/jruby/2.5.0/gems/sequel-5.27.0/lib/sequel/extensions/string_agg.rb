# frozen-string-literal: true
#
# The string_agg extension adds the ability to perform database-independent
# aggregate string concatentation.  For example, with a table like:
#
#   c1 | c2
#   ---+---
#   a  | 1
#   a  | 2
#   a  | 3
#   b  | 4
#
# You can return a result set like:
#
#   c1 | c2s
#   ---+---
#   a  | 1,2,3
#   b  | 4
#
# First, you need to load the extension into the database:
#
#   DB.extension :string_agg
#
# Then you can use the Sequel.string_agg method to return a Sequel
# expression:
#
#   sa = Sequel.string_agg(:column_name)
#   # or:
#   sa = Sequel.string_agg(:column_name, '-') # custom separator
#
# You can specify the order in which the concatention happens by
# calling +order+ on the expression:
#
#   sa = Sequel.string_agg(:column_name).order(:other_column)
#
# Additionally, if you want to have the concatenation only operate
# on distinct values, you can call distinct:
#
#   sa = Sequel.string_agg(:column_name).order(:other_column).distinct
#
# These expressions can be used in your datasets, or anywhere else that
# Sequel expressions are allowed:
#
#   DB[:table].
#     select_group(:c1).
#     select_append(Sequel.string_agg(:c2))
#
# This extension currenly supports the following databases:
#
# * PostgreSQL 9+
# * SQLAnywhere 12+
# * Oracle 11g+ (except distinct)
# * DB2 9.7+ (except distinct)
# * MySQL
# * HSQLDB
# * H2
#
# Related module: Sequel::SQL::StringAgg

#
module Sequel
  module SQL
    module Builders
      # Return a StringAgg expression for an aggregate string concatentation.
      def string_agg(*a)
        StringAgg.new(*a)
      end
    end

    # The StringAgg class represents an aggregate string concatentation.
    class StringAgg < GenericExpression
      include StringMethods
      include StringConcatenationMethods
      include InequalityMethods
      include AliasMethods
      include CastMethods
      include OrderMethods
      include PatternMatchMethods
      include SubscriptMethods

      # These methods are added to datasets using the string_agg
      # extension, for the purposes of correctly literalizing StringAgg
      # expressions for the appropriate database type.
      module DatasetMethods
        # Append the SQL fragment for the StringAgg expression to the SQL query.
        def string_agg_sql_append(sql, sa)
          if defined?(super)
            return super
          end

          expr = sa.expr
          separator = sa.separator || ","
          order = sa.order_expr
          distinct = sa.is_distinct?

          case db_type = db.database_type
          when :postgres, :sqlanywhere
            f = Function.new(db_type == :postgres ? :string_agg : :list, expr, separator)
            if order
              f = f.order(*order)
            end
            if distinct
              f = f.distinct
            end
            literal_append(sql, f)
          when :mysql, :hsqldb, :h2
            sql << "GROUP_CONCAT("
            if distinct
              sql << "DISTINCT "
            end
            literal_append(sql, expr)
            if order
              sql << " ORDER BY "
              expression_list_append(sql, order)
            end
            sql << " SEPARATOR "
            literal_append(sql, separator)
            sql << ")"
          when :oracle, :db2
            if distinct
              raise Error, "string_agg with distinct is not implemented on #{db.database_type}"
            end
            literal_append(sql, Function.new(:listagg, expr, separator))
            if order
              sql << " WITHIN GROUP (ORDER BY "
              expression_list_append(sql, order)
              sql << ")"
            else
              sql << " WITHIN GROUP (ORDER BY 1)"
            end
          else
            raise Error, "string_agg is not implemented on #{db.database_type}"
          end
        end
      end

      # The string expression for each row that will concatenated to the output.
      attr_reader :expr

      # The separator between each string expression.
      attr_reader :separator

      # The expression that the aggregation is ordered by.
      attr_reader :order_expr

      # Set the expression and separator
      def initialize(expr, separator=nil)
        @expr = expr
        @separator = separator
        yield self if block_given?
        freeze
      end

      # Whether the current expression uses distinct expressions 
      def is_distinct?
        @distinct == true
      end

      # Return a modified StringAgg that uses distinct expressions
      def distinct
        self.class.new(@expr, @separator) do |sa|
          sa.instance_variable_set(:@order_expr, @order_expr) if @order_expr
          sa.instance_variable_set(:@distinct, true)
        end
      end

      # Return a modified StringAgg with the given order
      def order(*o)
        self.class.new(@expr, @separator) do |sa|
          sa.instance_variable_set(:@distinct, @distinct) if @distinct
          sa.instance_variable_set(:@order_expr, o.empty? ? nil : o.freeze)
        end
      end

      to_s_method :string_agg_sql
    end
  end

  Dataset.register_extension(:string_agg, SQL::StringAgg::DatasetMethods)
end

