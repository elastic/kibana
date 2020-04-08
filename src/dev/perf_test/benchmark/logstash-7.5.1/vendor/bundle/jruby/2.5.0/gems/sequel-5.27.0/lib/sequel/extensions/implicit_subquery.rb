# frozen-string-literal: true
#
# The implicit_subquery extension changes most dataset methods that
# return modified datasets to implicitly call from_self if the database
# currently uses raw SQL.  Sequel's by default does not do this:
#
#   DB["SELECT * FROM table"].select(:column).sql
#   # => "SELECT * FROM table"
#
# With this extension, datasets that use raw SQL are implicitly wrapped
# in a subquery:
#
#   DB["SELECT * FROM table"].select(:column).sql
#   # => "SELECT column FROM (SELECT * FROM table) AS t1"
#
# To add this extension to an existing dataset:
#
#   ds = ds.extension(:implicit_subquery)
#
# To set this as the default behavior for all datasets on a single database:
#
#   DB.extension(:implicit_subquery)
#
# Related module: Sequel::Dataset::ImplicitSubquery

#
module Sequel
  class Dataset
    module ImplicitSubquery
      exceptions = [:add_graph_aliases, :filter, :from, :from_self, :naked, :or, :order_more,
                    :qualify, :reverse, :reverse_order, :select_all, :select_more, :server,
                    :set_graph_aliases, :unfiltered, :ungraphed, :ungrouped, :unlimited, :unordered,
                    :with_sql]
      additions = [:join_table]
      (Dataset::QUERY_METHODS - Dataset::JOIN_METHODS - exceptions + additions).each do |meth|
        define_method(meth) do |*a, &b|
          if opts[:sql]
            from_self.public_send(meth, *a, &b)
          else
            super(*a, &b)
          end
        end
      end
    end

    register_extension(:implicit_subquery, ImplicitSubquery)
  end
end
