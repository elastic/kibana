# frozen-string-literal: true
#
# The dataset_source_alias extension changes Sequel's
# default behavior of automatically aliasing datasets
# from using t1, t2, etc. to using an alias based on
# the source of the dataset.  Example:
#
#   DB.from(DB.from(:a))
#   # default: SELECT * FROM (SELECT * FROM a) AS t1
#   # with extension: SELECT * FROM (SELECT * FROM a) AS a
#
# This also works when joining:
#
#   DB[:a].join(DB[:b], [:id])
#   # SELECT * FROM a INNER JOIN (SELECT * FROM b) AS b USING (id)
#
# To avoid conflicting aliases, this attempts to alias tables
# uniquely if it detects a conflict:
#
#   DB.from(:a, DB.from(:a))
#   # SELECT * FROM a, (SELECT * FROM a) AS a_0
#
# Note that not all conflicts are correctly detected and handled.
# It is encouraged to alias your datasets manually instead of
# relying on the auto-aliasing if there would be a conflict.
#
# In the places where Sequel cannot determine the
# appropriate alias to use for the dataset, it will fallback to
# the standard t1, t2, etc. aliasing.
#
# You can load this extension into specific datasets:
#
#   ds = DB[:table]
#   ds = ds.extension(:dataset_source_alias)
#
# Or you can load it into all of a database's datasets, which
# is probably the desired behavior if you are using this extension:
#
#   DB.extension(:dataset_source_alias)
#
# Related module: Sequel::Dataset::DatasetSourceAlias

#
module Sequel
  class Dataset
    module DatasetSourceAlias
      # Preprocess the list of sources and attempt to alias any
      # datasets in the sources to the first source of the respective
      # dataset.
      def from(*source, &block)
        virtual_row_columns(source, block)
        table_aliases = []
        source = source.map do |s|
          case s
          when Dataset
            s = dataset_source_alias_expression(s, table_aliases)
          when Symbol, String, SQL::AliasedExpression, SQL::Identifier, SQL::QualifiedIdentifier
            table_aliases << alias_symbol(s)
          end
          s
        end
        super(*source, &nil)
      end

      # If a Dataset is given as the table argument, attempt to alias
      # it to its source.
      def join_table(type, table, expr=nil, options=OPTS)
        if table.is_a?(Dataset) && !options[:table_alias]
          table = dataset_source_alias_expression(table)
        end
        super
      end

      private

      # Attempt to automatically alias the given dataset to its source.
      # If the dataset cannot be automatically aliased to its source,
      # return it unchanged.  The table_aliases argument is a list of
      # already used alias symbols, which will not be used as the alias.
      def dataset_source_alias_expression(ds, table_aliases=[])
        base = ds.first_source if ds.opts[:from]
        case base
        when Symbol, String, SQL::AliasedExpression, SQL::Identifier, SQL::QualifiedIdentifier
          aliaz = unused_table_alias(base, table_aliases)
          table_aliases << aliaz
          ds.as(aliaz)
        else
          ds
        end
      end
    end

    register_extension(:dataset_source_alias, DatasetSourceAlias)
  end
end
