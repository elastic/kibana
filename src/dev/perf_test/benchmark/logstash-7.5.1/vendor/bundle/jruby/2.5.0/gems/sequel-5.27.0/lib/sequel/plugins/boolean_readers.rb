# frozen-string-literal: true

module Sequel
  module Plugins
    # The boolean_readers plugin allows for the creation of attribute? methods
    # for boolean columns, which provides a nicer API.  By default, the accessors
    # are created for all columns of type :boolean.  However, you can provide a
    # block to the plugin to change the criteria used to determine if a
    # column is boolean.  The block is yielded with the column symbol for each
    # column in the models dataset.
    #
    # Usage:
    #
    #   # Add boolean attribute? methods for all columns of type :boolean
    #   # in all model subclasses (called before loading subclasses)
    #   Sequel::Model.plugin :boolean_readers
    #
    #   # Add boolean readers for all tinyint columns in the Album class
    #   Album.plugin(:boolean_readers){|c| db_schema[c][:db_type] =~ /\Atinyint/}
    #
    #   # Add a boolean reader for a specific columns in the Artist class
    #   Artist.plugin(:boolean_readers){|c| [:column1, :column2, :column3].include?(c)}
    module BooleanReaders
      # Default proc for determining if given column is a boolean, which
      # just checks that the :type is boolean.
      DEFAULT_BOOLEAN_ATTRIBUTE_PROC = lambda{|c| s = db_schema[c] and s[:type] == :boolean}

      # Add the boolean_attribute? class method to the model, and create
      # attribute? boolean reader methods for the class's columns if the class has a dataset.
      def self.configure(model, &block)
        model.instance_exec do
          define_singleton_method(:boolean_attribute?, &(block || DEFAULT_BOOLEAN_ATTRIBUTE_PROC))
          send(:create_boolean_readers) if @dataset
        end
      end

      module ClassMethods
        Plugins.after_set_dataset(self, :create_boolean_readers)

        private

        # Add a attribute? method for the column to a module included in the class.
        def create_boolean_reader(column)
          overridable_methods_module.module_eval do
            define_method("#{column}?"){model.db.typecast_value(:boolean, get_column_value(column))}
          end
        end

        # Add attribute? methods for all of the boolean attributes for this model.
        def create_boolean_readers
          im = instance_methods.map(&:to_s)
          if cs = check_non_connection_error(false){columns}
            cs.each{|c| create_boolean_reader(c) if boolean_attribute?(c) && !im.include?("#{c}?")}
          end
        end
      end
    end
  end
end
