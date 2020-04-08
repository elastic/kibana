# frozen-string-literal: true

module Sequel
  module Plugins
    # The column_conflicts plugin overrides Model#get_column_value and #set_column_value
    # to automatically handle column names that conflict with Ruby/Sequel method names.
    #
    # By default, Model#get_column_value and #set_column_value just call send, this
    # plugin overrides the methods and gets/sets the value directly in the values
    # hash if the column name conflicts with an existing Sequel::Model instance
    # method name.
    #
    # Checking for column conflicts causes a performance hit, which is why Sequel
    # does not enable such checks by default.
    #
    # When using this plugin, you can manually update the columns used.  This may be useful if
    # the columns conflict with one of your custom methods, instead of a method defined in
    # Sequel::Model:
    #
    #   Album.plugin :column_conflicts
    #   Album.get_column_conflict!(:column)
    #   Album.set_column_conflict!(:other_column)
    #
    # Usage:
    #
    #   # Make all model's handle column conflicts automatically (called before loading subclasses)
    #   Sequel::Model.plugin :column_conflicts
    #
    #   # Make the Album class handle column conflicts automatically
    #   Album.plugin :column_conflicts
    module ColumnConflicts
      def self.apply(model)
        model.instance_exec do
          @get_column_conflicts = {}
          @set_column_conflicts = {}
        end
      end

      # Check for column conflicts on the current model if the model has a dataset.
      def self.configure(model)
        model.instance_exec do
          check_column_conflicts if @dataset
        end
      end

      module ClassMethods
        Plugins.after_set_dataset(self, :check_column_conflicts)
        Plugins.inherited_instance_variables(self, :@get_column_conflicts=>:dup, :@set_column_conflicts=>:dup)

        # Hash for columns where the getter method already exists. keys are column symbols/strings that
        # conflict with method names and should be looked up directly instead of calling a method,
        # values are the column symbol to lookup in the values hash.
        attr_reader :get_column_conflicts

        # Hash for columns where the setter method already exists. keys are column symbols/strings suffixed
        # with = that conflict with method names and should be set directly in the values hash,
        # values are the column symbol to set in the values hash.
        attr_reader :set_column_conflicts

        # Compare the column names for the model with the methods defined on Sequel::Model, and automatically
        # setup the column conflicts.
        def check_column_conflicts
          mod = Sequel::Model
          columns.find_all{|c| mod.method_defined?(c)}.each{|c| get_column_conflict!(c)}
          columns.find_all{|c| mod.method_defined?("#{c}=")}.each{|c| set_column_conflict!(c)}
        end

        # Freeze column conflict information when freezing model class.
        def freeze
          @get_column_conflicts.freeze
          @set_column_conflicts.freeze

          super
        end

        # Set the given column as one with a getter method conflict.
        def get_column_conflict!(column)
          @get_column_conflicts[column.to_sym] = @get_column_conflicts[column.to_s] = column.to_sym
        end

        # Set the given column as one with a setter method conflict.
        def set_column_conflict!(column)
          @set_column_conflicts[:"#{column}="] = @set_column_conflicts["#{column}="] = column.to_sym
        end
      end

      module InstanceMethods
        # If the given column has a getter method conflict, lookup the value directly in the values hash.
        def get_column_value(c)
          if col = model.get_column_conflicts[c]
            self[col]
          else
            super
          end
        end

        # If the given column has a setter method conflict, set the value directly in the values hash.
        def set_column_value(c, v)
          if col = model.set_column_conflicts[c]
            self[col] = v
          else
            super
          end
        end
      end
    end
  end
end
