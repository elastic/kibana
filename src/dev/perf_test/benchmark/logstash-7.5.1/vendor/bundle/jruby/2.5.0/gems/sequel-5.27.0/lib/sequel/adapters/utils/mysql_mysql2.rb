# frozen-string-literal: true

require_relative '../shared/mysql'
require_relative 'stored_procedures'

module Sequel
  module MySQL
    # This module is used by the mysql and mysql2 adapters to support
    # prepared statements and stored procedures.
    module MysqlMysql2
      module DatabaseMethods
        disconnect_errors = <<-END.split("\n").map(&:strip)
        Commands out of sync; you can't run this command now
        Can't connect to local MySQL server through socket
        MySQL server has gone away
        Lost connection to MySQL server during query
        MySQL client is not connected
        This connection is still waiting for a result, try again once you have the result
        closed MySQL connection
        The MySQL server is running with the --read-only option so it cannot execute this statement
        END
        # Error messages for mysql and mysql2 that indicate the current connection should be disconnected
        MYSQL_DATABASE_DISCONNECT_ERRORS = /\A#{Regexp.union(disconnect_errors)}/
       
        # Support stored procedures on MySQL
        def call_sproc(name, opts=OPTS, &block)
          args = opts[:args] || [] 
          execute("CALL #{name}#{args.empty? ? '()' : literal(args)}", opts.merge(:sproc=>false), &block)
        end
        
        # Executes the given SQL using an available connection, yielding the
        # connection if the block is given.
        def execute(sql, opts=OPTS, &block)
          if opts[:sproc]
            call_sproc(sql, opts, &block)
          elsif sql.is_a?(Symbol)
            execute_prepared_statement(sql, opts, &block)
          else
            synchronize(opts[:server]){|conn| _execute(conn, sql, opts, &block)}
          end
        end
        
        private

        def add_prepared_statements_cache(conn)
          class << conn
            attr_accessor :prepared_statements
          end
          conn.prepared_statements = {}
        end

        def database_specific_error_class(exception, opts)
          case exception.errno
          when 1048
            NotNullConstraintViolation
          when 1062
            UniqueConstraintViolation
          when 1451, 1452, 1216, 1217
            ForeignKeyConstraintViolation
          when 4025
            CheckConstraintViolation
          when 1205
            DatabaseLockTimeout
          else
            super
          end
        end
      end

      module DatasetMethods
        include Sequel::Dataset::StoredProcedures
       
        StoredProcedureMethods = Sequel::Dataset.send(:prepared_statements_module,
          "sql = @opts[:sproc_name]; opts = Hash[opts]; opts[:args] = @opts[:sproc_args]; opts[:sproc] = true",
          Sequel::Dataset::StoredProcedureMethods, %w'execute execute_dui')
        
        private

        # Extend the dataset with the MySQL stored procedure methods.
        def prepare_extend_sproc(ds)
          ds.with_extend(StoredProcedureMethods)
        end
      end
    end
  end
end
