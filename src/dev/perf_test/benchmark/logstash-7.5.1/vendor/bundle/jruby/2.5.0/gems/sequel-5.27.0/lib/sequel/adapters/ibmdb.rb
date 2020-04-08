# frozen-string-literal: true

require 'ibm_db'
require_relative 'shared/db2'

module Sequel

  module IBMDB
    tt = Class.new do
      def boolean(s) !s.to_i.zero? end
      def int(s) s.to_i end
    end.new

    # Hash holding type translation methods, used by Dataset#fetch_rows.
    DB2_TYPES = {
      :boolean => tt.method(:boolean),
      :int => tt.method(:int),
      :blob => ::Sequel::SQL::Blob.method(:new),
      :time => ::Sequel.method(:string_to_time),
      :date => ::Sequel.method(:string_to_date)
    }.freeze

    # Wraps an underlying connection to DB2 using IBM_DB, to provide a more
    # rubyish API.
    class Connection
      # A hash with prepared statement name symbol keys, where each value is 
      # a two element array with an sql string and cached Statement value.
      attr_reader :prepared_statements

      # Error class for exceptions raised by the connection.
      class Error < StandardError
        attr_reader :sqlstate

        def initialize(message, sqlstate)
          @sqlstate = sqlstate
          super(message)
        end
      end

      # Create the underlying IBM_DB connection.
      def initialize(connection_param)
        @conn = if connection_param.class == String
          IBM_DB.connect(connection_param, '', '')
        else  # connect using catalog 
          IBM_DB.connect(*connection_param)
        end

        self.autocommit = true
        @prepared_statements = {}
      end

      # Check whether the connection is in autocommit state or not.
      def autocommit
        IBM_DB.autocommit(@conn) == 1
      end

      # Turn autocommit on or off for the connection.
      def autocommit=(value)
        IBM_DB.autocommit(@conn, value ? IBM_DB::SQL_AUTOCOMMIT_ON : IBM_DB::SQL_AUTOCOMMIT_OFF)
      end

      # Close the connection, disconnecting from DB2.
      def close
        IBM_DB.close(@conn)
      end

      # Commit the currently outstanding transaction on this connection.
      def commit
        IBM_DB.commit(@conn)
      end

      # Return the related error message for the connection.
      def error_msg
        IBM_DB.getErrormsg(@conn, IBM_DB::DB_CONN)
      end

      # Return the related error message for the connection.
      def error_sqlstate
        IBM_DB.getErrorstate(@conn, IBM_DB::DB_CONN)
      end

      # Execute the given SQL on the database, and return a Statement instance
      # holding the results.
      def execute(sql)
        stmt = IBM_DB.exec(@conn, sql)
        raise Error.new(error_msg, error_sqlstate) unless stmt
        Statement.new(stmt)
      end

      # Execute the related prepared statement on the database with the given
      # arguments.
      def execute_prepared(ps_name, *values)
        stmt = @prepared_statements[ps_name].last
        res = stmt.execute(*values)
        unless res
          raise Error.new("Error executing statement #{ps_name}: #{error_msg}", error_sqlstate)
        end
        stmt
      end

      # Prepare a statement with the given +sql+ on the database, and
      # cache the prepared statement value by name.
      def prepare(sql, ps_name)
        if stmt = IBM_DB.prepare(@conn, sql)
          ps_name = ps_name.to_sym
          stmt = Statement.new(stmt)
          @prepared_statements[ps_name] = [sql, stmt]
        else
          err = error_msg
          err = "Error preparing #{ps_name} with SQL: #{sql}" if error_msg.nil? || error_msg.empty?
          raise Error.new(err, error_sqlstate)
        end
      end

      # Rollback the currently outstanding transaction on this connection.
      def rollback
        IBM_DB.rollback(@conn)
      end
    end

    # Wraps results returned by queries on IBM_DB.
    class Statement
      # Hold the given statement.
      def initialize(stmt)
        @stmt = stmt
      end

      # Return the number of rows affected.
      def affected
        IBM_DB.num_rows(@stmt)
      end

      # If this statement is a prepared statement, execute it on the database
      # with the given values.
      def execute(*values)
        IBM_DB.execute(@stmt, values)
      end

      # Return the results of a query as an array of values.
      def fetch_array
        IBM_DB.fetch_array(@stmt) if @stmt
      end

      # Return the field name at the given column in the result set.
      def field_name(ind)
        IBM_DB.field_name(@stmt, ind)
      end

      # Return the field type for the given field name in the result set.
      def field_type(key)
        IBM_DB.field_type(@stmt, key)
      end

      # Return the field precision for the given field name in the result set.
      def field_precision(key)
        IBM_DB.field_precision(@stmt, key)
      end

      # Free the memory related to this statement.
      def free
        IBM_DB.free_stmt(@stmt)
      end

      # Free the memory related to this result set, only useful for prepared
      # statements which have a different result set on every call.
      def free_result
        IBM_DB.free_result(@stmt)
      end

      # Return the number of fields in the result set.
      def num_fields
        IBM_DB.num_fields(@stmt)
      end
    end

    class Database < Sequel::Database
      include Sequel::DB2::DatabaseMethods

      set_adapter_scheme :ibmdb

      # Hash of connection procs for converting
      attr_reader :conversion_procs

      # Whether to convert smallint values to bool for this Database instance
      attr_accessor :convert_smallint_to_bool
    
      # Create a new connection object for the given server.
      def connect(server)
        opts = server_opts(server)

        connection_params = if opts[:host].nil? && opts[:port].nil? && opts[:database]
          # use a cataloged connection
          opts.values_at(:database, :user, :password)
        else
          # use uncataloged connection so that host and port can be supported
          'Driver={IBM DB2 ODBC DRIVER};' \
          "Database=#{opts[:database]};" \
          "Hostname=#{opts[:host]};" \
          "Port=#{opts[:port] || 50000};" \
          'Protocol=TCPIP;' \
          "Uid=#{opts[:user]};" \
          "Pwd=#{opts[:password]};" \
        end 

        Connection.new(connection_params)
      end

      def execute(sql, opts=OPTS, &block)
        if sql.is_a?(Symbol)
          execute_prepared_statement(sql, opts, &block)
        else
          synchronize(opts[:server]){|c| _execute(c, sql, opts, &block)}
        end
      rescue Connection::Error => e
        raise_error(e)
      end

      def execute_insert(sql, opts=OPTS)
        synchronize(opts[:server]) do |c|
          if sql.is_a?(Symbol)
            execute_prepared_statement(sql, opts)
          else
            _execute(c, sql, opts)
          end
          _execute(c, "SELECT IDENTITY_VAL_LOCAL() FROM SYSIBM.SYSDUMMY1", opts){|stmt| i = stmt.fetch_array.first.to_i; i}
        end
      rescue Connection::Error => e
        raise_error(e)
      end

      # Execute a prepared statement named by name on the database.
      def execute_prepared_statement(ps_name, opts)
        args = opts[:arguments]
        ps = prepared_statement(ps_name)
        sql = ps.prepared_sql
        synchronize(opts[:server]) do |conn|
          unless conn.prepared_statements.fetch(ps_name, []).first == sql
            log_connection_yield("PREPARE #{ps_name}: #{sql}", conn){conn.prepare(sql, ps_name)}
          end
          args = args.map{|v| v.nil? ? nil : prepared_statement_arg(v)}
          log_sql = "EXECUTE #{ps_name}"
          if ps.log_sql
            log_sql += " ("
            log_sql << sql
            log_sql << ")"
          end
          begin
            stmt = log_connection_yield(log_sql, conn, args){conn.execute_prepared(ps_name, *args)}
            if block_given?
              yield(stmt)
            else  
              stmt.affected
            end
          ensure
            stmt.free_result if stmt
          end
        end
      end

      def freeze
        @conversion_procs.freeze
        super
      end

      private

      # Execute the given SQL on the database, yielding the related statement if a block
      # is given or returning the number of affected rows if not, and ensuring the statement is freed.
      def _execute(conn, sql, opts)
        stmt = log_connection_yield(sql, conn){conn.execute(sql)}
        if block_given?
          yield(stmt)
        else  
          stmt.affected
        end
      ensure
        stmt.free if stmt
      end

      def adapter_initialize
        @convert_smallint_to_bool = typecast_value_boolean(opts.fetch(:convert_smallint_to_bool, true))
        @conversion_procs = DB2_TYPES.dup
        @conversion_procs[:timestamp] = method(:to_application_timestamp)
      end

      # IBM_DB uses an autocommit setting instead of sending SQL queries.
      # So starting a transaction just turns autocommit off.
      def begin_transaction(conn, opts=OPTS)
        log_connection_yield('Transaction.begin', conn){conn.autocommit = false}
        set_transaction_isolation(conn, opts)
      end

      # This commits transaction in progress on the
      # connection and sets autocommit back on.
      def commit_transaction(conn, opts=OPTS)
        log_connection_yield('Transaction.commit', conn){conn.commit}
      end
    
      def database_error_classes
        [Connection::Error]
      end

      def database_exception_sqlstate(exception, opts)
        exception.sqlstate
      end

      def dataset_class_default
        Dataset
      end

      # Don't convert smallint to boolean for the metadata
      # dataset, since the DB2 metadata does not use
      # boolean columns, and some smallint columns are
      # accidently treated as booleans.
      def _metadata_dataset
        super.with_convert_smallint_to_bool(false)
      end

      # Format Numeric, Date, and Time types specially for use
      # as IBM_DB prepared statements argument vlaues.
      def prepared_statement_arg(v)
        case v
        when Numeric
          v.to_s
        when Date, Time
          literal(v).gsub("'", '')
        else
          v
        end
      end

      # Set autocommit back on
      def remove_transaction(conn, committed)
        conn.autocommit = true
      ensure
        super
      end

      # This rolls back the transaction in progress on the
      # connection and sets autocommit back on.
      def rollback_transaction(conn, opts=OPTS)
        log_connection_yield('Transaction.rollback', conn){conn.rollback}
      end

      # Convert smallint type to boolean if convert_smallint_to_bool is true
      def schema_column_type(db_type)
        if convert_smallint_to_bool && db_type =~ /smallint/i 
          :boolean
        else
          super
        end
      end
    end
    
    class Dataset < Sequel::Dataset
      include Sequel::DB2::DatasetMethods

      module CallableStatementMethods
        # Extend given dataset with this module so subselects inside subselects in
        # prepared statements work.
        def subselect_sql_append(sql, ds)
          ps = ds.to_prepared_statement(:select).
            clone(:append_sql=>sql, :prepared_args=>prepared_args).
            with_extend(CallableStatementMethods)
          ps = ps.bind(@opts[:bind_vars]) if @opts[:bind_vars]
          ps.prepared_sql
        end
      end
      
      PreparedStatementMethods = prepared_statements_module(:prepare_bind, Sequel::Dataset::UnnumberedArgumentMapper)

      # Whether to convert smallint to boolean arguments for this dataset.
      # Defaults to the Database setting.
      def convert_smallint_to_bool
        opts.has_key?(:convert_smallint_to_bool) ? opts[:convert_smallint_to_bool] : db.convert_smallint_to_bool
      end

      # Return a cloned dataset with the convert_smallint_to_bool option set.
      def with_convert_smallint_to_bool(v)
        clone(:convert_smallint_to_bool=>v)
      end

      def fetch_rows(sql)
        execute(sql) do |stmt|
          columns = []
          convert = convert_smallint_to_bool
          cps = db.conversion_procs
          stmt.num_fields.times do |i|
            k = stmt.field_name i
            key = output_identifier(k)
            type = stmt.field_type(i).downcase.to_sym
            # decide if it is a smallint from precision
            type = :boolean  if type == :int && convert && stmt.field_precision(i) < 8
            type = :blob if type == :clob && db.use_clob_as_blob
            columns << [key, cps[type]]
          end
          cols = columns.map{|c| c[0]}
          self.columns = cols

          while res = stmt.fetch_array
            row = {}
            res.zip(columns).each do |v, (k, pr)|
              row[k] = ((pr ? pr.call(v) : v) if v)
            end
            yield row
          end
        end
        self
      end

      private

      def bound_variable_modules
        [CallableStatementMethods]
      end

      def prepared_statement_modules
        [PreparedStatementMethods]
      end
    end
  end
end
