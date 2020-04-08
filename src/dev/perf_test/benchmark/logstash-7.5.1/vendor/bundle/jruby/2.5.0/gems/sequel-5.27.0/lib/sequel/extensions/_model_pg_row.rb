# frozen-string-literal: true

module Sequel
  module Plugins
    module PgRow
      module DatabaseMethods
        # Handle Sequel::Model instances in bound variables.
        def bound_variable_arg(arg, conn)
          case arg
          when Sequel::Model
            "(#{arg.values.values_at(*arg.columns).map{|v| bound_variable_array(v)}.join(',')})"
          else
            super
          end
        end

        # If a Sequel::Model instance is given, return it as-is
        # instead of attempting to convert it.
        def row_type(db_type, v)
          if v.is_a?(Sequel::Model)
            v
          else
            super
          end
        end

        private

        # Handle Sequel::Model instances in bound variable arrays.
        def bound_variable_array(arg)
          case arg
          when Sequel::Model
            "\"(#{arg.values.values_at(*arg.columns).map{|v| bound_variable_array(v)}.join(',').gsub(/("|\\)/, '\\\\\1')})\""
          else
            super
          end
        end
      end
    end
  end

  Database.register_extension(:_model_pg_row, Plugins::PgRow::DatabaseMethods)
end
