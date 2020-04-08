# frozen-string-literal: true
#
# The constant_sql_override extension allows you to change the SQL
# generated for Sequel constants.
#
# One possible use-case for this is to have Sequel::CURRENT_TIMESTAMP use UTC time when
# you have Sequel.database_timezone = :utc, but the database uses localtime when
# generating CURRENT_TIMESTAMP.
#
# You can set SQL overrides with Database#set_constant_sql:
#
#   DB.set_constant_sql(Sequel::CURRENT_TIMESTAMP, "CURRENT_TIMESTAMP AT TIME ZONE 'UTC'")
#
# Now, using Sequel::CURRENT_TIMESTAMP will use your override instead:
#
#   Album.where(released_at: Sequel::CURRENT_TIMESTAMP).sql
#   # => SELECT "albums.*" FROM "albums" WHERE ("released_at" = CURRENT_TIMESTAMP AT TIME ZONE 'UTC')
#
# To use this extension, first load it into your Sequel::Database instance:
#
#   DB.extension :constant_sql_override
#
# Related module: Sequel::ConstantSqlOverride

#
module Sequel
  module ConstantSqlOverride
    module DatabaseMethods
      # Create the initial empty hash of constant sql overrides.
      def self.extended(db)
        db.instance_exec do
          @constant_sqls ||= {}
          extend_datasets(DatasetMethods)
        end
      end

      # Hash mapping constant symbols to SQL.  For internal use only.
      attr_reader :constant_sqls # :nodoc:

      # Set the SQL to use for the given Sequel::SQL::Constant
      def set_constant_sql(constant, override)
        @constant_sqls[constant.constant] = override
      end

      # Freeze the constant_sqls hash to prevent adding new overrides.
      def freeze
        @constant_sqls.freeze
        super
      end
    end

    module DatasetMethods
      # Use overridden constant SQL
      def constant_sql_append(sql, constant)
        if constant_sql = db.constant_sqls[constant]
          sql << constant_sql
        else
          super
        end
      end
    end
  end

  Database.register_extension(:constant_sql_override, ConstantSqlOverride::DatabaseMethods)
end
