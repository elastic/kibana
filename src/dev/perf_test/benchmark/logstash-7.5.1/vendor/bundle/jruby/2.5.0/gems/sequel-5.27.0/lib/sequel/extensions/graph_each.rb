# frozen-string-literal: true
#
# The graph_each extension adds Dataset#graph_each and
# makes Dataset#each call #graph_each if the dataset has been graphed.
# Dataset#graph_each splits result hashes into subhashes per table:
#
#   DB[:a].graph(:b, id: :b_id).all
#   # => {:a=>{:id=>1, :b_id=>2}, :b=>{:id=>2}}
#
# You can load this extension into specific datasets:
#
#   ds = DB[:table]
#   ds = ds.extension(:graph_each)
#
# Or you can load it into all of a database's datasets, which
# is probably the desired behavior if you are using this extension:
#
#   DB.extension(:graph_each)
#
# Related module: Sequel::GraphEach

#
module Sequel
  module GraphEach
    # Call graph_each for graphed datasets that are not being eager graphed.
    def each
      if @opts[:graph] && !@opts[:eager_graph]
        graph_each{|r| yield r}
      else
        super
      end
    end

    # Call graph_each for graphed datasets that are not being eager graphed.
    def with_sql_each(sql)
      if @opts[:graph] && !@opts[:eager_graph]
        graph_each(sql){|r| yield r}
      else
        super
      end
    end

    private

    # Fetch the rows, split them into component table parts,
    # tranform and run the row_proc on each part (if applicable),
    # and yield a hash of the parts.
    def graph_each(sql=select_sql)
      # Reject tables with nil datasets, as they are excluded from
      # the result set
      datasets = @opts[:graph][:table_aliases].to_a.reject{|ta,ds| ds.nil?}
      # Get just the list of table aliases into a local variable, for speed
      table_aliases = datasets.map{|ta,ds| ta}
      # Get an array of arrays, one for each dataset, with
      # the necessary information about each dataset, for speed
      datasets = datasets.map{|ta, ds| [ta, ds, ds.row_proc]}
      # Use the manually set graph aliases, if any, otherwise
      # use the ones automatically created by .graph
      column_aliases = @opts[:graph][:column_aliases]
      fetch_rows(sql) do |r|
        graph = {}
        # Create the sub hashes, one per table
        table_aliases.each{|ta| graph[ta]={}}
        # Split the result set based on the column aliases
        # If there are columns in the result set that are
        # not in column_aliases, they are ignored
        column_aliases.each do |col_alias, tc|
          ta, column = tc
          graph[ta][column] = r[col_alias]
        end
        # For each dataset run the row_proc if applicable
        datasets.each do |ta,ds,rp|
          g = graph[ta]
          graph[ta] = if g.values.any?{|x| !x.nil?}
            rp ? rp.call(g) : g
          else
            nil
          end
        end

        yield graph
      end
      self
    end
  end

  Dataset.register_extension(:graph_each, GraphEach)
end
