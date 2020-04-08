# frozen-string-literal: true

Sequel::JDBC.load_driver('org.apache.derby.jdbc.EmbeddedDriver', :Derby)
require_relative 'transactions'

module Sequel
  module JDBC
    Sequel.synchronize do
      DATABASE_SETUP[:derby] = proc do |db|
        db.extend(Sequel::JDBC::Derby::DatabaseMethods)
        db.dataset_class = Sequel::JDBC::Derby::Dataset
        org.apache.derby.jdbc.EmbeddedDriver
      end
    end

    module Derby
      module DatabaseMethods
        include ::Sequel::JDBC::Transactions

        # Derby doesn't support casting integer to varchar, only integer to char,
        # and char(254) appears to have the widest support (with char(255) failing).
        # This does add a bunch of extra spaces at the end, but those will be trimmed
        # elsewhere.
        def cast_type_literal(type)
          (type == String) ? 'CHAR(254)' : super
        end

        def database_type
          :derby
        end

        def freeze
          svn_version
          super
        end

        # Derby uses an IDENTITY sequence for autoincrementing columns.
        def serial_primary_key_options
          {:primary_key => true, :type => Integer, :identity=>true, :start_with=>1}
        end

        # The SVN version of the database.
        def svn_version
          @svn_version ||= begin
            v = synchronize{|c| c.get_meta_data.get_database_product_version}
            v =~ /\((\d+)\)\z/
            $1.to_i
          end
        end
        
        # Derby supports transactional DDL statements.
        def supports_transactional_ddl?
          true
        end

        private
        
        # Derby optimizes away Sequel's default check of SELECT NULL FROM table,
        # so use a SELECT * FROM table there.
        def _table_exists?(ds)
          ds.first
        end
    
        def alter_table_sql(table, op)
          case op[:op]
          when :rename_column
            "RENAME COLUMN #{quote_schema_table(table)}.#{quote_identifier(op[:name])} TO #{quote_identifier(op[:new_name])}"
          when :set_column_type
            # Derby is very limited in changing a columns type, so adding a new column and then dropping the existing column is
            # the best approach, as mentioned in the Derby documentation.
            temp_name = :x_sequel_temp_column_x
            [alter_table_sql(table, op.merge(:op=>:add_column, :name=>temp_name)),
             from(table).update_sql(temp_name=>::Sequel::SQL::Cast.new(op[:name], op[:type])),
             alter_table_sql(table, op.merge(:op=>:drop_column)),
             alter_table_sql(table, op.merge(:op=>:rename_column, :name=>temp_name, :new_name=>op[:name]))]
          when :set_column_null
            "ALTER TABLE #{quote_schema_table(table)} ALTER COLUMN #{quote_identifier(op[:name])} #{op[:null] ? 'NULL' : 'NOT NULL'}"
          else
            super
          end
        end

        # Derby does not allow adding primary key constraints to NULLable columns.
        def can_add_primary_key_constraint_on_nullable_columns?
          false
        end

        # Derby doesn't allow specifying NULL for columns, only NOT NULL.
        def column_definition_null_sql(sql, column)
          null = column.fetch(:null, column[:allow_null])
          sql << " NOT NULL" if null == false || (null.nil? && column[:primary_key])
        end
    
        # Add NOT LOGGED for temporary tables to improve performance.
        def create_table_sql(name, generator, options)
          s = super
          s += ' NOT LOGGED' if options[:temp]
          s
        end

        # Insert data from the current table into the new table after
        # creating the table, since it is not possible to do it in one step.
        def create_table_as(name, sql, options)
          super
          from(name).insert(sql.is_a?(Dataset) ? sql : dataset.with_sql(sql))
        end

        # Derby currently only requires WITH NO DATA, with a separate insert
        # to import data.
        def create_table_as_sql(name, sql, options)
          "#{create_table_prefix_sql(name, options)} AS #{sql} WITH NO DATA"
        end

        # Temporary table creation on Derby uses DECLARE instead of CREATE.
        def create_table_prefix_sql(name, options)
          if options[:temp]
            "DECLARE GLOBAL TEMPORARY TABLE #{quote_identifier(name)}"
          else
            super
          end
        end

        DATABASE_ERROR_REGEXPS = {
          /The statement was aborted because it would have caused a duplicate key value in a unique or primary key constraint or unique index/ => UniqueConstraintViolation,
          /violation of foreign key constraint/ => ForeignKeyConstraintViolation,
          /The check constraint .+ was violated/ => CheckConstraintViolation,
          /cannot accept a NULL value/ => NotNullConstraintViolation,
          /A lock could not be obtained due to a deadlock/ => SerializationFailure,
        }.freeze
        def database_error_regexps
          DATABASE_ERROR_REGEXPS
        end

        # Use IDENTITY_VAL_LOCAL() to get the last inserted id.
        def last_insert_id(conn, opts=OPTS)
          statement(conn) do |stmt|
            sql = 'SELECT IDENTITY_VAL_LOCAL() FROM sysibm.sysdummy1'
            rs = log_connection_yield(sql, conn){stmt.executeQuery(sql)}
            rs.next
            rs.getLong(1)
          end
        end

        # Handle nil values by using setNull with the correct parameter type.
        def set_ps_arg_nil(cps, i)
          cps.setNull(i, cps.getParameterMetaData.getParameterType(i))
        end
      
        # Derby uses RENAME TABLE syntax to rename tables.
        def rename_table_sql(name, new_name)
          "RENAME TABLE #{quote_schema_table(name)} TO #{quote_schema_table(new_name)}"
        end

        # Primary key indexes appear to be named sqlNNNN on Derby
        def primary_key_index_re
          /\Asql\d+\z/i
        end

        # If an :identity option is present in the column, add the necessary IDENTITY SQL.
        def type_literal(column)
          if column[:identity]
            sql = "#{super} GENERATED BY DEFAULT AS IDENTITY"
            if sw = column[:start_with]
              sql += " (START WITH #{sw.to_i}"
              sql << " INCREMENT BY #{column[:increment_by].to_i}" if column[:increment_by]
              sql << ")"
            end
            sql
          else
            super
          end
        end

        # Derby uses clob for text types.
        def uses_clob_for_text?
          true
        end

        def valid_connection_sql
          @valid_connection_sql ||= select(1).sql
        end
      end
      
      class Dataset < JDBC::Dataset
        # Derby doesn't support an expression between CASE and WHEN,
        # so remove conditions.
        def case_expression_sql_append(sql, ce)
          super(sql, ce.with_merged_expression)
        end

        # If the type is String, trim the extra spaces since CHAR is used instead
        # of varchar.  This can cause problems if you are casting a char/varchar to
        # a string and the ending whitespace is important.
        def cast_sql_append(sql, expr, type)
          if type == String
            sql << "RTRIM("
            super
            sql << ')'
          else
            super
          end
        end

        def complex_expression_sql_append(sql, op, args)
          case op
          when :%, :'B~'
            complex_expression_emulate_append(sql, op, args)
          when :&, :|, :^, :<<, :>>
            raise Error, "Derby doesn't support the #{op} operator"
          when :**
            sql << 'exp('
            literal_append(sql, args[1])
            sql << ' * ln('
            literal_append(sql, args[0])
            sql << "))"
          when :extract
            sql << args[0].to_s << '('
            literal_append(sql, args[1])
            sql << ')'
          else
            super
          end
        end

        # Derby supports GROUP BY ROLLUP (but not CUBE)
        def supports_group_rollup?
          true
        end

        # Derby does not support IS TRUE.
        def supports_is_true?
          false
        end

        # Derby does not support IN/NOT IN with multiple columns
        def supports_multiple_column_in?
          false
        end

        private

        def empty_from_sql
          " FROM sysibm.sysdummy1"
        end

        # Derby needs a hex string casted to BLOB for blobs.
        def literal_blob_append(sql, v)
          sql << "CAST(X'" << v.unpack("H*").first << "' AS BLOB)"
        end

        # Derby needs the standard workaround to insert all default values into
        # a table with more than one column.
        def insert_supports_empty_values?
          false
        end

        # Newer Derby versions can use the FALSE literal, but older versions need an always false expression.
        def literal_false
          if db.svn_version >= 1040133
            'FALSE'
          else
            '(1 = 0)'
          end
        end

        # Derby handles fractional seconds in timestamps, but not in times
        def literal_sqltime(v)
          v.strftime("'%H:%M:%S'")
        end

        # Newer Derby versions can use the TRUE literal, but older versions need an always false expression.
        def literal_true
          if db.svn_version >= 1040133
            'TRUE'
          else
            '(1 = 1)'
          end
        end

        # Derby supports multiple rows for VALUES in INSERT.
        def multi_insert_sql_strategy
          :values
        end

        # Emulate the char_length function with length
        def native_function_name(emulated_function)
          if emulated_function == :char_length
            'length'
          else
            super
          end
        end

        # Offset comes before limit in Derby
        def select_limit_sql(sql)
          if o = @opts[:offset]
            sql << " OFFSET "
            literal_append(sql, o)
            sql << " ROWS"
          end
          if l = @opts[:limit]
            sql << " FETCH FIRST "
            literal_append(sql, l)
            sql << " ROWS ONLY"
          end
        end
      end
    end
  end
end
