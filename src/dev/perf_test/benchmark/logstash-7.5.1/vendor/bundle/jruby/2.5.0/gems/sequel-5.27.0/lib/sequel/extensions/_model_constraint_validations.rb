# frozen-string-literal: true

module Sequel
  module Plugins
    module ConstraintValidations
      module DatabaseMethods
        # A hash of validation method call metadata for all tables in the database.
        # The hash is keyed by table name string and contains arrays of validation
        # method call arrays.
        attr_accessor :constraint_validations
      end
    end
  end

  Database.register_extension(:_model_constraint_validations, Plugins::ConstraintValidations::DatabaseMethods)
end
