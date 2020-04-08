# frozen-string-literal: true

module Sequel
  module Plugins
    # If the model's dataset selects explicit columns and the
    # database supports it, the insert_returning_select plugin will
    # automatically set the RETURNING clause on the dataset used to
    # insert rows to the columns selected, which allows the default model
    # support to run the insert and refresh of the data in a single
    # query, instead of two separate queries.  This is Sequel's default
    # behavior when the model does not select explicit columns.
    #
    # Usage:
    #
    #   # Make all model subclasses automatically setup insert returning clauses
    #   Sequel::Model.plugin :insert_returning_select
    #
    #   # Make the Album class automatically setup insert returning clauses
    #   Album.plugin :insert_returning_select
    module InsertReturningSelect
      # Modify the current model's dataset selection, if the model
      # has a dataset.
      def self.configure(model)
        model.instance_exec do
          self.dataset = dataset if @dataset && @dataset.opts[:select]
        end
      end

      module ClassMethods
        # The dataset to use to insert new rows.  For internal use only.
        attr_reader :instance_insert_dataset

        private

        # When reseting the instance dataset, also reset the instance_insert_dataset.
        def reset_instance_dataset
          ret = super
          return unless ds = @instance_dataset

          if columns = insert_returning_columns(ds)
            ds = ds.returning(*columns)
          end
          @instance_insert_dataset = ds

          ret
        end

        # Determine the columns to use for the returning clause, or return nil
        # if they can't be determined and a returning clause should not be
        # added automatically.
        def insert_returning_columns(ds)
          return unless ds.supports_returning?(:insert)
          return unless values = ds.opts[:select]

          values = values.map{|v| ds.unqualified_column_for(v)}
          if values.all?
            values
          end
        end
      end
      
      module InstanceMethods
        private

        # Use the instance_insert_dataset as the base dataset for the insert.
        def _insert_dataset
          use_server(model.instance_insert_dataset)
        end
      end
    end
  end
end
