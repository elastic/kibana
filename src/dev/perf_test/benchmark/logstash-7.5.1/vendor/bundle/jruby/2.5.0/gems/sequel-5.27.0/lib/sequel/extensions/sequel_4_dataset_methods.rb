# frozen-string-literal: true
#
# This adds the following dataset methods:
#
# and :: alias for where
# exclude_where :: alias for exclude
# interval :: Returns max - min, using a single query
# range :: Returns min..max, using a single query
#
# It is only recommended to use this for backwards compatibility.
#
# You can load this extension into specific datasets:
#
#   ds = DB[:table]
#   ds = ds.extension(:sequel_4_dataset_methods)
#
# Or you can load it into all of a database's datasets, which
# is probably the desired behavior if you are using this extension:
#
#   DB.extension(:sequel_4_dataset_methods)
#
# Related module: Sequel::Sequel4DatasetMethods

#
module Sequel
  module Sequel4DatasetMethods
    # Alias for where.
    def and(*cond, &block)
      where(*cond, &block)
    end
    
    # Alias for exclude.
    def exclude_where(*cond, &block)
      exclude(*cond, &block)
    end

    # Returns the interval between minimum and maximum values for the given 
    # column/expression. Uses a virtual row block if no argument is given.
    #
    #   DB[:table].interval(:id) # SELECT (max(id) - min(id)) FROM table LIMIT 1
    #   # => 6
    #   DB[:table].interval{function(column)} # SELECT (max(function(column)) - min(function(column))) FROM table LIMIT 1
    #   # => 7
    def interval(column=(no_arg = true), &block)
      column = Sequel.virtual_row(&block) if no_arg
      if loader = cached_placeholder_literalizer(:_interval_loader) do |pl|
          arg = pl.arg
          aggregate_dataset.limit(1).select((SQL::Function.new(:max, arg) - SQL::Function.new(:min, arg)).as(:interval))
        end

        loader.get(column)
      else
        aggregate_dataset.get{(max(column) - min(column)).as(:interval)}
      end
    end

    # Returns a +Range+ instance made from the minimum and maximum values for the
    # given column/expression.  Uses a virtual row block if no argument is given.
    #
    #   DB[:table].range(:id) # SELECT max(id) AS v1, min(id) AS v2 FROM table LIMIT 1
    #   # => 1..10
    #   DB[:table].interval{function(column)} # SELECT max(function(column)) AS v1, min(function(column)) AS v2 FROM table LIMIT 1
    #   # => 0..7
    def range(column=(no_arg = true), &block)
      column = Sequel.virtual_row(&block) if no_arg
      r = if loader = cached_placeholder_literalizer(:_range_loader) do |pl|
            arg = pl.arg
            aggregate_dataset.limit(1).select(SQL::Function.new(:min, arg).as(:v1), SQL::Function.new(:max, arg).as(:v2))
          end

        loader.first(column)
      else
        aggregate_dataset.select{[min(column).as(v1), max(column).as(v2)]}.first
      end

      if r
        (r[:v1]..r[:v2])
      end
    end
    
  end

  Dataset.register_extension(:sequel_4_dataset_methods, Sequel4DatasetMethods)
end

