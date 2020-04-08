# frozen-string-literal: true
#
# This changes Sequel's literalization of IN/NOT IN with an empty
# array value to consider NULL values if one of the referenced
# columns is NULL:
#
#   DB[:test].where(name: [])
#   # SELECT * FROM test WHERE (name != name)
#   DB[:test].exclude(name: [])
#   # SELECT * FROM test WHERE (name = name)
#
# The default Sequel behavior is to ignore NULLs, as the above
# query is not generally optimized well by databases.
#
# You can load this extension into specific datasets:
#
#   ds = DB[:table]
#   ds = ds.extension(:empty_array_consider_nulls)
#
# Or you can load it into all of a database's datasets, which
# is probably the desired behavior if you are using this extension:
#
#   DB.extension(:empty_array_consider_nulls)
#
# Related module: Sequel::EmptyArrayConsiderNulls

#
module Sequel
  module EmptyArrayConsiderNulls
    # Use an expression that returns NULL if the column value is NULL.
    def empty_array_value(op, cols)
      c = Array(cols)
      SQL::BooleanExpression.from_value_pairs(c.zip(c), :AND, op == :IN)
    end
    
  end

  Dataset.register_extension(:empty_array_consider_nulls, EmptyArrayConsiderNulls)
end
