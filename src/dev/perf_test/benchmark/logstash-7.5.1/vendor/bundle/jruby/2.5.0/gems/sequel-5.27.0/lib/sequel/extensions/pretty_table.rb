# frozen-string-literal: true
#
# The pretty_table extension adds Sequel::Dataset#print and the
# Sequel::PrettyTable class for creating nice-looking plain-text
# tables.  Example:
#
#   +--+-------+
#   |id|name   |
#   |--+-------|
#   |1 |fasdfas|
#   |2 |test   |
#   +--+-------+
#
# You can load this extension into specific datasets:
#
#   ds = DB[:table]
#   ds = ds.extension(:pretty_table)
#
# Or you can load it into all of a database's datasets, which
# is probably the desired behavior if you are using this extension:
#
#   DB.extension(:pretty_table)
#
# Related module: Sequel::DatasetPrinter

#
module Sequel
  extension :_pretty_table

  module DatasetPrinter
    # Pretty prints the records in the dataset as plain-text table.
    def print(*cols)
      ds = naked
      rows = ds.all
      Sequel::PrettyTable.print(rows, cols.empty? ? ds.columns : cols)
    end
  end

  Dataset.register_extension(:pretty_table, DatasetPrinter)
end
