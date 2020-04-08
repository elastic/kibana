# frozen-string-literal: true

module Sequel
  module UnmodifiedIdentifiers
    module DatabaseMethods
      private

      # Databases that use this module for unquoted identifiers to lowercase.
      def folds_unquoted_identifiers_to_uppercase?
        false
      end
    end

    module DatasetMethods
      private

      # Turn the given symbol/string into a symbol, keeping the current case.
      def output_identifier(v)
        v == '' ? :untitled : v.to_sym
      end

      # Turn the given symbol/string into a string, keeping the current case.
      def input_identifier(v)
        v.to_s
      end
    end
  end
end
