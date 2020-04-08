# frozen-string-literal: true
#
# The query extension adds a query method which allows
# a different way to construct queries instead of the usual
# method chaining:
#
#   dataset = DB[:items].query do
#     select :x, :y, :z
#     where{(x > 1) & (y > 2)}
#     reverse :z
#   end
#
# You can load this extension into specific datasets:
#
#   ds = DB[:table]
#   ds = ds.extension(:query)
#
# Or you can load it into all of a database's datasets, which
# is probably the desired behavior if you are using this extension:
#
#   DB.extension(:query)
#
# Related modules: Sequel::DatabaseQuery, Sequel::DatasetQuery,
# Sequel::Dataset::Query

#
module Sequel
  module DatabaseQuery
    def self.extended(db)
      db.extend_datasets(DatasetQuery)
    end

    # Return a dataset modified by the query block
    def query(&block)
      dataset.query(&block)
    end
  end

  module DatasetQuery
    # Translates a query block into a dataset. Query blocks are an
    # alternative to Sequel's usual method chaining, by using
    # instance_exec with a proxy object:
    #
    #   dataset = DB[:items].query do
    #     select :x, :y, :z
    #     where{(x > 1) & (y > 2)}
    #     reverse :z
    #   end
    #
    # Which is the same as:
    #
    #  dataset = DB[:items].select(:x, :y, :z).where{(x > 1) & (y > 2)}.reverse(:z)
    def query(&block)
      query = Dataset::Query.new(self)
      query.instance_exec(&block)
      query.dataset
    end
  end

  class Dataset
    # Proxy object used by Dataset#query.
    class Query < Sequel::BasicObject
      # The current dataset in the query.  This changes on each method call.
      attr_reader :dataset
     
      def initialize(dataset)
        @dataset = dataset
      end

      # Replace the query's dataset with dataset returned by the method call.
      def method_missing(method, *args, &block)
        # Allow calling private methods, so things like raise works
        @dataset = @dataset.send(method, *args, &block)
        raise(Sequel::Error, "method #{method.inspect} did not return a dataset") unless @dataset.is_a?(Dataset)
        self
      end
    end
  end

  Dataset.register_extension(:query, DatasetQuery)
  Database.register_extension(:query, DatabaseQuery)
end
