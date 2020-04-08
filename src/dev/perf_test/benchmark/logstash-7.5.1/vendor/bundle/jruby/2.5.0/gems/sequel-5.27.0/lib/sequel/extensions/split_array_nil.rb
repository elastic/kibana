# frozen-string-literal: true
#
# The split_array_nil extension overrides Sequel's default handling of
# IN/NOT IN with arrays of values to do specific nil checking.  For example,
#
#   ds = DB[:table].where(column: [1, nil])
# 
# By default, that produces the following SQL:
#
#   SELECT * FROM table WHERE (column IN (1, NULL))
#
# However, because NULL = NULL is not true in SQL (it is NULL), this
# will not return rows in the table where the column is NULL.  This
# extension allows for an alternative behavior more similar to ruby,
# which will return rows in the table where the column is NULL, using
# a query like:
#
#   SELECT * FROM table WHERE ((column IN (1)) OR (column IS NULL)))
#
# Similarly, for NOT IN queries:
#
#   ds = DB[:table].exclude(column: [1, nil])
#   # Default:
#   #   SELECT * FROM table WHERE (column NOT IN (1, NULL))
#   # with split_array_nils extension:
#   #   SELECT * FROM table WHERE ((column NOT IN (1)) AND (column IS NOT NULL)))
#
# To use this extension with a single dataset:
#
#   ds = ds.extension(:split_array_nil)
#
# To use this extension for all of a database's datasets:
#
#   DB.extension(:split_array_nil)
#
# Related module: Sequel::Dataset::SplitArrayNil

#
module Sequel
  class Dataset
    module SplitArrayNil
      # Over the IN/NOT IN handling with an array of values where one of the
      # values in the array is nil, by removing nils from the array of values,
      # and using a separate OR IS NULL clause for IN or AND IS NOT NULL clause
      # for NOT IN.
      def complex_expression_sql_append(sql, op, args)
      case op
      when :IN, :"NOT IN"
        vals = args[1]
        if vals.is_a?(Array) && vals.any?(&:nil?)
          cols = args[0]
          vals = vals.compact
          c = Sequel::SQL::BooleanExpression
          if op == :IN
            literal_append(sql, c.new(:OR, c.new(:IN, cols, vals), c.new(:IS, cols, nil)))
          else
            literal_append(sql, c.new(:AND, c.new(:"NOT IN", cols, vals), c.new(:"IS NOT", cols, nil)))
          end
        else
          super
        end
      else
        super
      end
      end
    end
  end

  Dataset.register_extension(:split_array_nil, Dataset::SplitArrayNil)
end
