# frozen-string-literal: true

module Sequel
  class Model
    # This Module subclass is used by Model.dataset_module
    # to add dataset methods to classes.  In addition to the
    # methods offered by Dataset::DatasetModule, it also
    # automatically creates class methods for public dataset
    # methods.
    class DatasetModule < Dataset::DatasetModule
      # Store the model related to this dataset module.
      def initialize(model)
        @model = model
      end

      # Alias for where.
      def subset(name, *args, &block)
        where(name, *args, &block)
      end

      private

      # Add a class method to the related model that
      # calls the dataset method of the same name.
      def method_added(meth)
        @model.send(:def_model_dataset_method, meth) if public_method_defined?(meth)
        super
      end
    end

    @dataset_module_class = DatasetModule
  end
end
