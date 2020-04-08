# frozen-string-literal: true
#
# The identifier_mangling extension adds support for to change
# the default identifier mangling for datasets, as well as all
# datasets for a given database.
#
#   # Use uppercase identifiers in database, and lowercase in ruby.
#   # Default behavior of Sequel, as the SQL standard behavior
#   # folds unquoted identifiers to uppercase.
#   DB.identifier_input_method = :upcase
#   DB.identifier_output_method = :downcase
#   
#   # Don't modify identifiers.
#   # Default behavior of Sequel on PostgreSQL, MySQL, SQLite,
#   # as they fold unquoted identifiers to lowercase.
#   DB.identifier_input_method = nil
#   DB.identifier_output_method = nil
#
# You can also choose to turn on or off identifier quoting:
#
#   # Quote identifiers.  Sequel's default behavior.
#   DB.quote_identifiers = true
# 
#   # Don't quote identifiers.  Sequel's default behavior on DB2.
#   DB.quote_identifiers = false
#   
# To modify the identifiers on a per-dataset basis:
#
#   ds = DB[:a].with_input_indentifier(:upcase).
#               with_output_identifier(:downcase).
#               with_quote_identifiers(true)
#
# To load the extension into the database:
#
#   DB.extension :identifier_mangling
#
# Related modules: Sequel::IdentifierMangling::DatabaseMethods,
# Sequel::IdentifierMangling::DatasetMethods

#
module Sequel
  module IdentifierMangling
    module DatabaseMethods
      def self.extended(db)
        db.instance_exec do
          @identifier_input_method = nil
          @identifier_output_method = nil
          @quote_identifiers = nil
          reset_identifier_mangling
          extend_datasets(DatasetMethods)
        end
      end

      # The identifier input method to use by default for this database (default: adapter default)
      attr_reader :identifier_input_method

      # The identifier output method to use by default for this database (default: adapter default)
      attr_reader :identifier_output_method

      # Set the method to call on identifiers going into the database:
      #
      #   DB[:items] # SELECT * FROM items
      #   DB.identifier_input_method = :upcase
      #   DB[:items] # SELECT * FROM ITEMS
      def identifier_input_method=(v)
        reset_default_dataset
        @identifier_input_method = v
      end
      
      # Set the method to call on identifiers coming from the database:
      #
      #   DB[:items].first # {:id=>1, :name=>'foo'}
      #   DB.identifier_output_method = :upcase
      #   DB[:items].first # {:ID=>1, :NAME=>'foo'}
      def identifier_output_method=(v)
        reset_default_dataset
        @identifier_output_method = v
      end

      # Set whether to quote identifiers (columns and tables) for this database:
      #
      #   DB[:items] # SELECT * FROM items
      #   DB.quote_identifiers = true
      #   DB[:items] # SELECT * FROM "items"
      def quote_identifiers=(v)
        reset_default_dataset
        @quote_identifiers = v
      end
      
      # Returns true if the database quotes identifiers.
      def quote_identifiers?
        @quote_identifiers
      end

      private

      # Return a dataset that uses the default identifier input and output methods
      # for this database.  Used when parsing metadata so that column symbols are
      # returned as expected.
      def _metadata_dataset
        super.
          with_identifier_input_method(identifier_input_method_default).
          with_identifier_output_method(identifier_output_method_default)
      end

      # Upcase identifiers on input if database folds unquoted identifiers to
      # uppercase.
      def identifier_input_method_default
        return super if defined?(super)
        :upcase if folds_unquoted_identifiers_to_uppercase?
      end

      # Downcase identifiers on output if database folds unquoted identifiers to
      # uppercase.
      def identifier_output_method_default
        return super if defined?(super)
        :downcase if folds_unquoted_identifiers_to_uppercase?
      end

      # Reset the identifier mangling options.  Overrides any already set on
      # the instance.  Only for internal use by shared adapters.
      def reset_identifier_mangling
        @quote_identifiers = @opts.fetch(:quote_identifiers, quote_identifiers_default)
        @identifier_input_method = @opts.fetch(:identifier_input_method, identifier_input_method_default)
        @identifier_output_method = @opts.fetch(:identifier_output_method, identifier_output_method_default)
        reset_default_dataset
      end
    end

    module DatasetMethods
      # The String instance method to call on identifiers before sending them to
      # the database.
      def identifier_input_method
        @opts.fetch(:identifier_input_method, db.identifier_input_method)
      end
      
      # The String instance method to call on identifiers before sending them to
      # the database.
      def identifier_output_method
        @opts.fetch(:identifier_output_method, db.identifier_output_method)
      end
    
      # Check with the database to see if identifier quoting is enabled
      def quote_identifiers?
        @opts.fetch(:quote_identifiers, db.quote_identifiers?)
      end

      # Return a modified dataset with identifier_input_method set.
      def with_identifier_input_method(meth)
        clone(:identifier_input_method=>meth, :skip_symbol_cache=>true)
      end
      
      # Return a modified dataset with identifier_output_method set.
      def with_identifier_output_method(meth)
        clone(:identifier_output_method=>meth)
      end

      private

      # Convert the identifier to the version used in the database via
      # identifier_input_method.
      def input_identifier(v)
        (i = identifier_input_method) ? v.to_s.public_send(i) : v.to_s
      end

      # Modify the identifier returned from the database based on the
      # identifier_output_method.
      def output_identifier(v)
        v = 'untitled' if v == ''
        (i = identifier_output_method) ? v.to_s.public_send(i).to_sym : v.to_sym
      end

      def non_sql_option?(key)
        super || key == :identifier_input_method || key == :identifier_output_method
      end
    end
  end

  Database.register_extension(:identifier_mangling, IdentifierMangling::DatabaseMethods)
end
