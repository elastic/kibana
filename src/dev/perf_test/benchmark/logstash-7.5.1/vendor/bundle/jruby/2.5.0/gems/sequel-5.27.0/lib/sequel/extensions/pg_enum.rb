# frozen-string-literal: true
#
# The pg_enum extension adds support for Sequel to handle PostgreSQL's enum
# types.  To use this extension, first load it into your Database instance:
#
#   DB.extension :pg_enum
#
# It allows creation of enum types using create_enum:
#
#   DB.create_enum(:enum_type_name, %w'value1 value2 value3')
#
# You can also add values to existing enums via add_enum_value:
#
#   DB.add_enum_value(:enum_type_name, 'value4')
#
# If you want to rename an enum type, you can use rename_enum:
#
#   DB.rename_enum(:enum_type_name, :enum_type_another_name)
#
# If you want to rename an enum value, you can use rename_enum_value:
#
#   DB.rename_enum_value(
#     :enum_type_name, :enum_value_name, :enum_value_another_name
#   )
#
# If you want to drop an enum type, you can use drop_enum:
#
#   DB.drop_enum(:enum_type_name)
#
# Just like any user-created type, after creating the type, you
# can create tables that have a column of that type:
#
#   DB.create_table(:table_name) do
#     enum_type_name :column_name
#   end
#
# When parsing the schema, enum types are recognized, and available
# values returned in the schema hash:
#
#   DB.schema(:table_name)
#   [[:column_name, {:type=>:enum, :enum_values=>['value1', 'value2']}]]
#
# If the pg_array extension is used, arrays of enums are returned as a
# PGArray:
#
#   DB.create_table(:table_name) do
#     column :column_name, 'enum_type_name[]'
#   end
#   DB[:table_name].get(:column_name)
#   # ['value1', 'value2']
#
# If the migration extension is loaded before this one (the order is important),
# you can use create_enum in a reversible migration:
#
#   Sequel.migration do
#     change do
#       create_enum(:enum_type_name, %w'value1 value2 value3')
#     end
#   end
#
# Finally, typecasting for enums is setup to cast to strings, which
# allows you to use symbols in your model code.  Similar, you can provide
# the enum values as symbols when creating enums using create_enum or
# add_enum_value.
#
# Related module: Sequel::Postgres::EnumDatabaseMethods

#
module Sequel
  module Postgres
    # Methods enabling Database object integration with enum types.
    module EnumDatabaseMethods
      # Parse the available enum values when loading this extension into
      # your database.
      def self.extended(db)
        db.instance_exec do
          @enum_labels = {}
          parse_enum_labels
        end
      end

      # Run the SQL to add the given value to the existing enum type.
      # Options:
      # :after :: Add the new value after this existing value.
      # :before :: Add the new value before this existing value.
      # :if_not_exists :: Do not raise an error if the value already exists in the enum.
      def add_enum_value(enum, value, opts=OPTS)
        sql = String.new
        sql << "ALTER TYPE #{quote_schema_table(enum)} ADD VALUE#{' IF NOT EXISTS' if opts[:if_not_exists]} #{literal(value.to_s)}"
        if v = opts[:before]
          sql << " BEFORE #{literal(v.to_s)}"
        elsif v = opts[:after]
          sql << " AFTER #{literal(v.to_s)}"
        end
        _process_enum_change_sql(sql)
      end

      # Run the SQL to create an enum type with the given name and values.
      def create_enum(enum, values)
        _process_enum_change_sql("CREATE TYPE #{quote_schema_table(enum)} AS ENUM (#{values.map{|v| literal(v.to_s)}.join(', ')})")
      end

      # Run the SQL to rename the enum type with the given name
      # to the another given name.
      def rename_enum(enum, new_name)
        _process_enum_change_sql("ALTER TYPE #{quote_schema_table(enum)} RENAME TO #{quote_schema_table(new_name)}")
      end

      # Run the SQL to rename the enum value with the given name
      # to the another given name.
      def rename_enum_value(enum, old_name, new_name)
        _process_enum_change_sql("ALTER TYPE #{quote_schema_table(enum)} RENAME VALUE #{literal(old_name.to_s)} TO #{literal(new_name.to_s)}")
      end

      # Run the SQL to drop the enum type with the given name.
      # Options:
      # :if_exists :: Do not raise an error if the enum type does not exist
      # :cascade :: Also drop other objects that depend on the enum type
      def drop_enum(enum, opts=OPTS)
        _process_enum_change_sql("DROP TYPE#{' IF EXISTS' if opts[:if_exists]} #{quote_schema_table(enum)}#{' CASCADE' if opts[:cascade]}")
      end

      private

      # Run the SQL on the database, reparsing the enum labels after it is run.
      def _process_enum_change_sql(sql)
        run(sql)
        parse_enum_labels
        nil
      end

      # Parse the pg_enum table to get enum values, and
      # the pg_type table to get names and array oids for
      # enums.
      def parse_enum_labels
        order = [:enumtypid]
        order << :enumsortorder if server_version >= 90100

        enum_labels = metadata_dataset.from(:pg_enum).
          order(*order).
          select_hash_groups(Sequel.cast(:enumtypid, Integer).as(:v), :enumlabel).freeze
        enum_labels.each_value(&:freeze)

        if respond_to?(:register_array_type)
          array_types = metadata_dataset.
            from(:pg_type).
            where(:oid=>enum_labels.keys).
            exclude(:typarray=>0).
            select_map([:typname, Sequel.cast(:typarray, Integer).as(:v)])

          existing_oids = conversion_procs.keys
          array_types.each do |name, oid|
            next if existing_oids.include?(oid)
            register_array_type(name, :oid=>oid)
          end
        end

        Sequel.synchronize{@enum_labels.replace(enum_labels)}
      end

      # For schema entries that are enums, set the type to
      # :enum and add a :enum_values entry with the enum values.
      def schema_post_process(_)
        super.each do |_, s|
          oid = s[:oid]
          if values = Sequel.synchronize{@enum_labels[oid]}
            s[:type] = :enum
            s[:enum_values] = values
          end
        end
      end

      # Typecast the given value to a string.
      def typecast_value_enum(value)
        value.to_s
      end
    end
  end

  # support reversible create_enum statements if the migration extension is loaded
  if defined?(MigrationReverser)
    class MigrationReverser
      private
      def create_enum(name, _)
        @actions << [:drop_enum, name]
      end

      def rename_enum(old_name, new_name)
        @actions << [:rename_enum, new_name, old_name]
      end
    end
  end

  Database.register_extension(:pg_enum, Postgres::EnumDatabaseMethods)
end
