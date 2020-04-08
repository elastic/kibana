# frozen-string-literal: true

Sequel::JDBC.load_driver('com.mysql.jdbc.Driver', :MySQL)
require_relative '../shared/mysql'

module Sequel
  module JDBC
    Sequel.synchronize do
      DATABASE_SETUP[:mysql] = proc do |db|
        db.extend(Sequel::JDBC::MySQL::DatabaseMethods)
        db.extend_datasets Sequel::MySQL::DatasetMethods
        com.mysql.jdbc.Driver
      end
    end

    module MySQL
      module DatabaseMethods
        include Sequel::MySQL::DatabaseMethods
        
        private
        
        # MySQL exception handling with SQLState is less accurate than with regexps.
        def database_exception_use_sqlstates?
          false
        end

        # Raise a disconnect error if the SQL state of the cause of the exception indicates so.
        def disconnect_error?(exception, opts)
          exception.message =~ /\ACommunications link failure/ || super
        end

        # Get the last inserted id using LAST_INSERT_ID().
        def last_insert_id(conn, opts=OPTS)
          if stmt = opts[:stmt]
            rs = stmt.getGeneratedKeys
            begin
              if rs.next
                rs.getLong(1)
              else
                0
              end
            ensure
              rs.close
            end
          else
            statement(conn) do |st|
              rs = st.executeQuery('SELECT LAST_INSERT_ID()')
              rs.next
              rs.getLong(1)
            end
          end
        end

        # MySQL 5.1.12 JDBC adapter requires generated keys
        # and previous versions don't mind.
        def execute_statement_insert(stmt, sql)
          stmt.executeUpdate(sql, JavaSQL::Statement::RETURN_GENERATED_KEYS)
        end

        # Return generated keys for insert statements.
        def prepare_jdbc_statement(conn, sql, opts)
          opts[:type] == :insert ? conn.prepareStatement(sql, JavaSQL::Statement::RETURN_GENERATED_KEYS) : super
        end

        # Convert tinyint(1) type to boolean
        def schema_column_type(db_type)
          db_type =~ /\Atinyint\(1\)/ ? :boolean : super
        end
      
        # Run the default connection setting SQL statements.
        # Apply the connectiong setting SQLs for every new connection.
        def setup_connection(conn)
          mysql_connection_setting_sqls.each{|sql| statement(conn){|s| log_connection_yield(sql, conn){s.execute(sql)}}}
          super
        end

        # Handle unsigned integer values
        def setup_type_convertor_map
          super
          TypeConvertor::BASIC_MAP.dup
          @type_convertor_map[Java::JavaSQL::Types::SMALLINT] = @type_convertor_map[Java::JavaSQL::Types::INTEGER]
          @type_convertor_map[Java::JavaSQL::Types::INTEGER] = @type_convertor_map[Java::JavaSQL::Types::BIGINT]
          @basic_type_convertor_map[Java::JavaSQL::Types::SMALLINT] = @basic_type_convertor_map[Java::JavaSQL::Types::INTEGER]
          @basic_type_convertor_map[Java::JavaSQL::Types::INTEGER] = @basic_type_convertor_map[Java::JavaSQL::Types::BIGINT]
        end
      end
    end
  end
end
