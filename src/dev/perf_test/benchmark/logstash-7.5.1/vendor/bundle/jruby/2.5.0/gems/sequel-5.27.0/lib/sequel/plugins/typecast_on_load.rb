# frozen-string-literal: true

module Sequel
  module Plugins
    # The typecast_on_load plugin exists because most of Sequel's database adapters don't
    # have complete control over typecasting, and may return columns that aren't
    # typecast correctly (with correct being defined as how the model object
    # would typecast the same column values).
    #
    # This plugin makes model loading call the setter methods (which typecast
    # by default) for all columns given.  You can either specify the columns to
    # typecast on load in the plugin call itself, or afterwards using 
    # add_typecast_on_load_columns:
    #
    #   Album.plugin :typecast_on_load, :release_date, :record_date
    #   # or:
    #   Album.plugin :typecast_on_load
    #   Album.add_typecast_on_load_columns :release_date, :record_date
    #
    # If the database returns release_date and record_date columns as strings
    # instead of dates, this will ensure that if you access those columns through
    # the model object, you'll get Date objects instead of strings.
    module TypecastOnLoad
      # Call add_typecast_on_load_columns on the passed column arguments.
      def self.configure(model, *columns)
        model.instance_exec do
          @typecast_on_load_columns ||= []
          add_typecast_on_load_columns(*columns)
        end
      end

      module ClassMethods
        # The columns to typecast on load for this model.
        attr_reader :typecast_on_load_columns

        # Add additional columns to typecast on load for this model.
        def add_typecast_on_load_columns(*columns)
          @typecast_on_load_columns.concat(columns)
        end

        # Typecast values using #load_typecast when the values are retrieved
        # from the database.
        def call(values)
          o = super.load_typecast
          o.send(:_clear_changed_columns, :initialize)
          o
        end

        # Freeze typecast on load columns when freezing model class.
        def freeze
          @typecast_on_load_columns.freeze

          super
        end

        Plugins.inherited_instance_variables(self, :@typecast_on_load_columns=>:dup)
      end

      module InstanceMethods
        # Call the setter method for each of the model's typecast_on_load_columns
        # with the current value, so it can be typecasted correctly.
        def load_typecast
          model.typecast_on_load_columns.each do |c|
            if v = values[c]
              set_column_value("#{c}=", v)
            end
          end
          self
        end

        private

        # Typecast values using #load_typecast when the values are refreshed manually.
        def _refresh_set_values(values)
          ret = super
          load_typecast
          ret
        end

        # Typecast values using #load_typecast when the values are refreshed
        # automatically after a save.
        def _save_set_values(values)
          ret = super
          load_typecast
          ret
        end
      end
    end
  end
end
