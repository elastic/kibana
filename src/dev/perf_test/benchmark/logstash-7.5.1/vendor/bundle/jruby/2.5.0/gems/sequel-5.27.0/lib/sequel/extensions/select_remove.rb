# frozen-string-literal: true
#
# The select_remove extension adds select_remove for removing existing selected
# columns from a dataset.  It's not part of Sequel core as it is rarely needed and has
# some corner cases where it can't work correctly.
#
# You can load this extension into specific datasets:
#
#   ds = DB[:table]
#   ds = ds.extension(:select_remove)
#
# Or you can load it into all of a database's datasets, which
# is probably the desired behavior if you are using this extension:
#
#   DB.extension(:select_remove)
#
# Related module: Sequel::SelectRemove

#
module Sequel
  module SelectRemove
    # Remove columns from the list of selected columns.  If any of the currently selected
    # columns use expressions/aliases, this will remove selected columns with the given
    # aliases.  It will also remove entries from the selection that match exactly:
    #
    #   # Assume columns a, b, and c in items table
    #   DB[:items] # SELECT * FROM items
    #   DB[:items].select_remove(:c) # SELECT a, b FROM items
    #   DB[:items].select(:a, Sequel[:b].as(:c), Sequel[:c].as(:b)).select_remove(:c) # SELECT a, c AS b FROM items
    #   DB[:items].select(:a, Sequel[:b][:c], Sequel[:c][:b]).select_remove(Sequel[:c][:b]) # SELECT a, b AS c FROM items
    #
    # Note that there are a few cases where this method may not work correctly:
    #
    # * This dataset joins multiple tables and does not have an existing explicit selection.
    #   In this case, the code will currently use unqualified column names for all columns
    #   the dataset returns, except for the columns given.
    # * This dataset has an existing explicit selection containing an item that returns
    #   multiple database columns (e.g. Sequel[:table].*, Sequel.lit('column1, column2')).  In this case,
    #   the behavior is undefined and this method should not be used.
    #
    # There may be other cases where this method does not work correctly, use it with caution.
    def select_remove(*cols)
      if (sel = @opts[:select]) && !sel.empty?
        select(*(columns.zip(sel).reject{|c, s| cols.include?(c)}.map{|c, s| s} - cols))
      else
        select(*(columns - cols))
      end
    end
  end

  Dataset.register_extension(:select_remove, SelectRemove)
end
