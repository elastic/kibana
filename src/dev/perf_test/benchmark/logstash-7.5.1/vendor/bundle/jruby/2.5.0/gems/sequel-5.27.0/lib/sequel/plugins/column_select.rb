# frozen-string-literal: true

module Sequel
  module Plugins
    # The column_select plugin changes the default selection for a
    # model dataset to explicit select all columns from the table:
    # <tt>table.column1, table.column2, table.column3, ...</tt>.
    # This makes it simpler to add columns to the model's table
    # in a migration concurrently while running the application,
    # without it affecting the operation of the application.
    #
    # Note that by default on databases that supporting RETURNING,
    # using explicit column selections will cause instance creations
    # to use two queries (insert and refresh) instead of a single
    # query using RETURNING.  You can use the insert_returning_select
    # plugin to automatically use RETURNING for instance creations
    # for models where the column_select plugin automatically sets up
    # an explicit column selection.
    #
    # Usage:
    #
    #   # Make all model subclasses explicitly select qualified columns
    #   Sequel::Model.plugin :column_select
    #
    #   # Make the Album class select qualified columns
    #   Album.plugin :column_select
    module ColumnSelect
      # Modify the current model's dataset selection, if the model
      # has a dataset.
      def self.configure(model)
        model.instance_exec do
          self.dataset = dataset if @dataset
        end
      end

      module ClassMethods
        private

        # If the underlying dataset selects from a single table and
        # has no explicit selection, explicitly select all columns from that table,
        # qualifying them with table's name.
        def convert_input_dataset(ds)
          ds = super
          unless ds.opts[:select]
            if db.supports_schema_parsing?
              cols = check_non_connection_error(false){db.schema(ds)}
              if cols
                cols = cols.map{|c, _| c}
              end
            end

            if cols ||= check_non_connection_error(false){ds.columns}
              ds = ds.select(*cols.map{|c| Sequel.qualify(ds.first_source, Sequel.identifier(c))})
            end
          end
          ds
        end
      end
    end
  end
end
