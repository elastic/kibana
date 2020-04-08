# frozen-string-literal: true

module Sequel
  module Plugins
    # The boolean_subsets plugin allows for the automatic creation of subsets for
    # for boolean columns, which can DRY up model classes that define such subsets
    # manually.  By default, subsets are created for all columns of type :boolean,
    # with the subset name being the same as column name, and the conditions being
    # <tt>column IS TRUE</tt> (assuming the database supports that syntax).
    #
    # You can provide a block to the plugin, which will be called with column name
    # symbol, and should return an array of arguments to pass to +dataset_module.where+.
    # Using this, you can change the method name and arguments for each column.
    # This block is executed in the context of the model class.
    #
    # Usage:
    #
    #   # Add boolean subset methods for all columns of type :boolean
    #   # in all model subclasses (called before loading subclasses)
    #   Sequel::Model.plugin :boolean_subsets
    #
    #   # Add subsets for all boolean columns in the Album class
    #   Album.plugin(:boolean_subsets)
    #
    #   # Remove is_ from the front of the column name when creating the subset
    #   # method name, and use (column = 'Y') as the filter conditions
    #   Sequel::Model.plugin :boolean_subsets do |column|
    #     [column.to_s.sub(/\Ais_/, ''), {column=>'Y'}]
    #   end
    module BooleanSubsets
      # Create boolean subset methods for each boolean column.
      def self.configure(model, &block)
        model.instance_exec do
          define_singleton_method(:boolean_subset_args, &block) if block
          create_boolean_subsets if @dataset
        end
      end

      module ClassMethods
        Plugins.after_set_dataset(self, :create_boolean_subsets)

        private

        # The arguments to use when automatically defining a boolean subset for the given column.
        def boolean_subset_args(c)
          [c, {c=>true}]
        end

        # Add subset methods for all of the boolean columns in this model.
        def create_boolean_subsets
          if cs = check_non_connection_error(false){columns}
            cs = cs.select{|c| db_schema[c][:type] == :boolean}.map{|c| boolean_subset_args(c)}
            dataset_module do
              cs.each{|c| where(*c)}
            end
          end
        end
      end
    end
  end
end
