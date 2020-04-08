# frozen-string-literal: true

Sequel::JDBC.load_driver('org.sqlite.JDBC', :SQLite3)
require_relative '../shared/sqlite'

module Sequel
  module JDBC
    Sequel.synchronize do
      DATABASE_SETUP[:sqlite] = proc do |db|
        db.extend(Sequel::JDBC::SQLite::DatabaseMethods)
        db.extend_datasets Sequel::SQLite::DatasetMethods
        db.set_integer_booleans
        org.sqlite.JDBC
      end
    end

    module SQLite
      module ForeignKeyListPragmaConvertorFix
        # For the use of the convertor for String, working around a bug
        # in jdbc-sqlite3 that reports fields are of type
        # java.sql.types.NUMERIC even though they contain non-numeric data.
        def type_convertor(_, _, _, i)
          i > 2 ? TypeConvertor::CONVERTORS[:String] : super
        end
      end

      module TableInfoPragmaConvertorFix
        # For the use of the convertor for String, working around a bug
        # in jdbc-sqlite3 that reports dflt_value field is of type
        # java.sql.types.NUMERIC even though they contain string data.
        def type_convertor(_, _, _, i)
          i == 5 ? TypeConvertor::CONVERTORS[:String] : super
        end
      end

      module DatabaseMethods
        include Sequel::SQLite::DatabaseMethods
        
        # Swallow pointless exceptions when the foreign key list pragma
        # doesn't return any rows.
        def foreign_key_list(table, opts=OPTS)
          super
        rescue Sequel::DatabaseError => e
          raise unless foreign_key_error?(e)
          []
        end

        # Swallow pointless exceptions when the index list pragma
        # doesn't return any rows.
        def indexes(table, opts=OPTS)
          super
        rescue Sequel::DatabaseError => e
          raise unless foreign_key_error?(e)
          {}
        end

        private


        # Add workaround for bug when running foreign_key_list pragma
        def _foreign_key_list_ds(_)
          super.with_extend(ForeignKeyListPragmaConvertorFix)
        end

        # Add workaround for bug when running table_info pragma
        def _parse_pragma_ds(_, _)
          super.with_extend(TableInfoPragmaConvertorFix)
        end
        
        DATABASE_ERROR_REGEXPS = Sequel::SQLite::DatabaseMethods::DATABASE_ERROR_REGEXPS.merge(/Abort due to constraint violation/ => ConstraintViolation).freeze
        def database_error_regexps
          DATABASE_ERROR_REGEXPS
        end

        # Use last_insert_rowid() to get the last inserted id.
        def last_insert_id(conn, opts=OPTS)
          statement(conn) do |stmt|
            rs = stmt.executeQuery('SELECT last_insert_rowid()')
            rs.next
            rs.getLong(1)
          end
        end
        
        # Default to a single connection for a memory database.
        def connection_pool_default_options
          o = super
          uri == 'jdbc:sqlite::memory:' ? o.merge(:max_connections=>1) : o
        end
        
        # Execute the connection pragmas on the connection.
        def setup_connection(conn)
          conn = super(conn)
          statement(conn) do |stmt|
            connection_pragmas.each{|s| log_connection_yield(s, conn){stmt.execute(s)}}
          end
          conn
        end

        # Whether the given exception is due to a foreign key error.
        def foreign_key_error?(exception)
          exception.message =~ /query does not return ResultSet/
        end

        # Use getLong instead of getInt for converting integers on SQLite, since SQLite does not enforce a limit of 2**32.
        # Work around regressions in jdbc-sqlite 3.8.7 for date and blob types.
        def setup_type_convertor_map
          super
          @type_convertor_map[Java::JavaSQL::Types::INTEGER] = @type_convertor_map[Java::JavaSQL::Types::BIGINT]
          @basic_type_convertor_map[Java::JavaSQL::Types::INTEGER] = @basic_type_convertor_map[Java::JavaSQL::Types::BIGINT]
          x = @type_convertor_map[Java::JavaSQL::Types::DATE] = Object.new
          def x.call(r, i)
            if v = r.getString(i)
              Sequel.string_to_date(v)
            end
          end
          x = @type_convertor_map[Java::JavaSQL::Types::BLOB] = Object.new
          def x.call(r, i)
            if v = r.getBytes(i)
              Sequel::SQL::Blob.new(String.from_java_bytes(v))
            elsif !r.wasNull
              Sequel::SQL::Blob.new('')
            end
          end
        end

        # The result code for the exception, if the jdbc driver supports result codes for exceptions.
        def sqlite_error_code(exception)
          exception.resultCode.code if exception.respond_to?(:resultCode)
        end
      end
    end
  end
end
