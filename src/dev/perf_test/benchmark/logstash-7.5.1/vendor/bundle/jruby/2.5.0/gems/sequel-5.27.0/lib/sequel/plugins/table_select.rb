# frozen-string-literal: true

module Sequel
  module Plugins
    # The table_select plugin changes the default selection for a
    # model dataset from <tt>*</tt> to <tt>table.*</tt>.
    # This makes it so that if you join the model's dataset to
    # other tables, columns in the other tables do not appear
    # in the result sets (and possibly overwrite columns in the
    # current model with the same name).
    #
    # Usage:
    #
    #   # Make all model subclasses select table.*
    #   Sequel::Model.plugin :table_select
    #
    #   # Make the Album class select albums.*
    #   Album.plugin :table_select
    module TableSelect
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
        # has no explicit selection, select table.* from that table.
        def convert_input_dataset(ds)
          ds = super
          unless ds.opts[:select]
            ds = ds.select_all(ds.first_source)
          end
          ds
        end
      end
    end
  end
end
