# frozen-string-literal: true

require_relative 'shared/postgres'

begin 
  require 'pg' 

  Sequel::Postgres::PGError = PG::Error if defined?(PG::Error)
  Sequel::Postgres::PGconn = PG::Connection if defined?(PG::Connection)
  Sequel::Postgres::PGresult = PG::Result if defined?(PG::Result)

  # Work around postgres-pr 0.7.0+ which ships with a pg.rb file
  unless defined?(PG::Connection)
    raise LoadError unless defined?(PGconn::CONNECTION_OK)
  end

  Sequel::Postgres::USES_PG = true
  if defined?(PG::TypeMapByClass)
    type_map = Sequel::Postgres::PG_QUERY_TYPE_MAP = PG::TypeMapByClass.new
    type_map[Integer] = PG::TextEncoder::Integer.new
    type_map[FalseClass] = type_map[TrueClass] = PG::TextEncoder::Boolean.new
    type_map[Float] = PG::TextEncoder::Float.new
  end
rescue LoadError => e 
  begin
    require 'postgres-pr/postgres-compat'
    Sequel::Postgres::USES_PG = false
  rescue LoadError 
    raise e 
  end 
end

module Sequel
  module Postgres
    if Sequel::Postgres::USES_PG
      # Whether the given sequel_pg version integer is supported.
      def self.sequel_pg_version_supported?(version)
        version >= 10617
      end
    end

    # PGconn subclass for connection specific methods used with the
    # pg or postgres-pr driver.
    class Adapter < PGconn
      # The underlying exception classes to reraise as disconnect errors
      # instead of regular database errors.
      DISCONNECT_ERROR_CLASSES = [IOError, Errno::EPIPE, Errno::ECONNRESET]
      if defined?(::PG::ConnectionBad)
        DISCONNECT_ERROR_CLASSES << ::PG::ConnectionBad
      end
      DISCONNECT_ERROR_CLASSES.freeze
      
      disconnect_errors = [
        'ERROR:  cached plan must not change result type',
        'could not receive data from server',
        'no connection to the server',
        'connection not open',
        'connection is closed',
        'terminating connection due to administrator command',
        'PQconsumeInput() '
       ]

      # Since exception class based disconnect checking may not work,
      # also trying parsing the exception message to look for disconnect
      # errors.
      DISCONNECT_ERROR_RE = /\A#{Regexp.union(disconnect_errors)}/
      
      if USES_PG
        # Hash of prepared statements for this connection.  Keys are
        # string names of the server side prepared statement, and values
        # are SQL strings.
        attr_reader :prepared_statements
      else
        # Make postgres-pr look like pg
        CONNECTION_OK = -1

        # Escape bytea values.  Uses historical format instead of hex
        # format for maximum compatibility.
        def escape_bytea(str)
          str.gsub(/[\000-\037\047\134\177-\377]/n){|b| "\\#{sprintf('%o', b.each_byte{|x| break x}).rjust(3, '0')}"}
        end
        
        # Escape strings by doubling apostrophes.  This only works if standard
        # conforming strings are used.
        def escape_string(str)
          str.gsub("'", "''")
        end

        alias finish close

        def async_exec(sql)
          PGresult.new(@conn.query(sql))
        end

        def block(timeout=nil)
        end

        def status
          CONNECTION_OK
        end

        class PGresult < ::PGresult
          alias nfields num_fields
          alias ntuples num_tuples
          alias ftype type
          alias fname fieldname
          alias cmd_tuples cmdtuples
        end 
      end
      
      # Raise a Sequel::DatabaseDisconnectError if a one of the disconnect
      # error classes is raised, or a PGError is raised and the connection
      # status cannot be determined or it is not OK.
      def check_disconnect_errors
        begin
          yield
        rescue *DISCONNECT_ERROR_CLASSES => e
          disconnect = true
          raise(Sequel.convert_exception_class(e, Sequel::DatabaseDisconnectError))
        rescue PGError => e
          disconnect = false
          begin
            s = status
          rescue PGError
            disconnect = true
          end
          status_ok = (s == Adapter::CONNECTION_OK)
          disconnect ||= !status_ok
          disconnect ||= e.message =~ DISCONNECT_ERROR_RE
          disconnect ? raise(Sequel.convert_exception_class(e, Sequel::DatabaseDisconnectError)) : raise
        ensure
          block if status_ok && !disconnect
        end
      end

      # Execute the given SQL with this connection.  If a block is given,
      # yield the results, otherwise, return the number of changed rows.
      def execute(sql, args=nil)
        args = args.map{|v| @db.bound_variable_arg(v, self)} if args
        q = check_disconnect_errors{execute_query(sql, args)}
        begin
          block_given? ? yield(q) : q.cmd_tuples
        ensure
          q.clear if q && q.respond_to?(:clear)
        end
      end

      private

      # Return the PGResult containing the query results.
      def execute_query(sql, args)
        @db.log_connection_yield(sql, self, args){args ? async_exec(sql, args) : async_exec(sql)}
      end
    end
    
    class Database < Sequel::Database
      include Sequel::Postgres::DatabaseMethods

      set_adapter_scheme :postgresql
      set_adapter_scheme :postgres

      # Convert given argument so that it can be used directly by pg.  Currently, pg doesn't
      # handle fractional seconds in Time/DateTime or blobs with "\0". Only public for use by
      # the adapter, shouldn't be used by external code.
      def bound_variable_arg(arg, conn)
        case arg
        when Sequel::SQL::Blob
          {:value=>arg, :type=>17, :format=>1}
        when DateTime, Time
          literal(arg)
        else
          arg
        end
      end

      # Call a procedure with the given name and arguments.  Returns a hash if the procedure
      # returns a value, and nil otherwise.  Example:
      #
      #   DB.call_procedure(:foo, 1, 2)
      #   # CALL foo(1, 2)
      def call_procedure(name, *args)
        dataset.send(:call_procedure, name, args)
      end

      # Connects to the database.  In addition to the standard database
      # options, using the :encoding or :charset option changes the
      # client encoding for the connection, :connect_timeout is a
      # connection timeout in seconds, :sslmode sets whether postgres's
      # sslmode, and :notice_receiver handles server notices in a proc.
      # :connect_timeout, :driver_options, :sslmode, and :notice_receiver
      # are only supported if the pg driver is used.
      def connect(server)
        opts = server_opts(server)
        if USES_PG
          connection_params = {
            :host => opts[:host],
            :port => opts[:port],
            :dbname => opts[:database],
            :user => opts[:user],
            :password => opts[:password],
            :connect_timeout => opts[:connect_timeout] || 20,
            :sslmode => opts[:sslmode],
            :sslrootcert => opts[:sslrootcert]
          }.delete_if { |key, value| blank_object?(value) }
          connection_params.merge!(opts[:driver_options]) if opts[:driver_options]
          conn = Adapter.connect(opts[:conn_str] || connection_params)

          conn.instance_variable_set(:@prepared_statements, {})

          if receiver = opts[:notice_receiver]
            conn.set_notice_receiver(&receiver)
          end
        else
          unless typecast_value_boolean(@opts.fetch(:force_standard_strings, true))
            raise Error, "Cannot create connection using postgres-pr unless force_standard_strings is set"
          end

          conn = Adapter.connect(
            (opts[:host] unless blank_object?(opts[:host])),
            opts[:port] || 5432,
            nil, '',
            opts[:database],
            opts[:user],
            opts[:password]
          )
        end

        conn.instance_variable_set(:@db, self)
        if USES_PG && conn.respond_to?(:type_map_for_queries=) && defined?(PG_QUERY_TYPE_MAP)
          conn.type_map_for_queries = PG_QUERY_TYPE_MAP
        end

        if encoding = opts[:encoding] || opts[:charset]
          if conn.respond_to?(:set_client_encoding)
            conn.set_client_encoding(encoding)
          else
            conn.async_exec("set client_encoding to '#{encoding}'")
          end
        end

        connection_configuration_sqls(opts).each{|sql| conn.execute(sql)}
        conn
      end
      
      # Always false, support was moved to pg_extended_date_support extension.
      # Needs to stay defined here so that sequel_pg works.
      def convert_infinite_timestamps
        false
      end

      # Enable pg_extended_date_support extension if symbol or string is given.
      def convert_infinite_timestamps=(v)
        case v
        when Symbol, String, true
          extension(:pg_extended_date_support)
          self.convert_infinite_timestamps = v
        end
      end

      def disconnect_connection(conn)
        conn.finish
      rescue PGError, IOError
        nil
      end

      if USES_PG && Object.const_defined?(:PG) && ::PG.const_defined?(:Constants) && ::PG::Constants.const_defined?(:PG_DIAG_SCHEMA_NAME)
        # Return a hash of information about the related PGError (or Sequel::DatabaseError that
        # wraps a PGError), with the following entries (any of which may be +nil+):
        #
        # :schema :: The schema name related to the error
        # :table :: The table name related to the error
        # :column :: the column name related to the error
        # :constraint :: The constraint name related to the error
        # :type :: The datatype name related to the error
        # :severity :: The severity of the error (e.g. "ERROR")
        # :sql_state :: The SQL state code related to the error
        # :message_primary :: A single line message related to the error
        # :message_detail :: Any detail supplementing the primary message
        # :message_hint :: Possible suggestion about how to fix the problem
        # :statement_position :: Character offset in statement submitted by client where error occurred (starting at 1)
        # :internal_position :: Character offset in internal statement where error occurred (starting at 1)
        # :internal_query :: Text of internally-generated statement where error occurred
        # :source_file :: PostgreSQL source file where the error occurred
        # :source_line :: Line number of PostgreSQL source file where the error occurred
        # :source_function :: Function in PostgreSQL source file where the error occurred
        #
        # This requires a PostgreSQL 9.3+ server and 9.3+ client library,
        # and ruby-pg 0.16.0+ to be supported.
        def error_info(e)
          e = e.wrapped_exception if e.is_a?(DatabaseError)
          r = e.result
          {
            :schema => r.error_field(::PG::PG_DIAG_SCHEMA_NAME),
            :table => r.error_field(::PG::PG_DIAG_TABLE_NAME),
            :column => r.error_field(::PG::PG_DIAG_COLUMN_NAME),
            :constraint => r.error_field(::PG::PG_DIAG_CONSTRAINT_NAME),
            :type => r.error_field(::PG::PG_DIAG_DATATYPE_NAME),
            :severity => r.error_field(::PG::PG_DIAG_SEVERITY),
            :sql_state => r.error_field(::PG::PG_DIAG_SQLSTATE),
            :message_primary => r.error_field(::PG::PG_DIAG_MESSAGE_PRIMARY),
            :message_detail => r.error_field(::PG::PG_DIAG_MESSAGE_DETAIL),
            :message_hint => r.error_field(::PG::PG_DIAG_MESSAGE_HINT),
            :statement_position => r.error_field(::PG::PG_DIAG_STATEMENT_POSITION),
            :internal_position => r.error_field(::PG::PG_DIAG_INTERNAL_POSITION),
            :internal_query => r.error_field(::PG::PG_DIAG_INTERNAL_QUERY),
            :source_file => r.error_field(::PG::PG_DIAG_SOURCE_FILE),
            :source_line => r.error_field(::PG::PG_DIAG_SOURCE_LINE),
            :source_function => r.error_field(::PG::PG_DIAG_SOURCE_FUNCTION)
          }
        end
      end
      
      def execute(sql, opts=OPTS, &block)
        synchronize(opts[:server]){|conn| check_database_errors{_execute(conn, sql, opts, &block)}}
      end

      if USES_PG
        # +copy_table+ uses PostgreSQL's +COPY TO STDOUT+ SQL statement to return formatted
        # results directly to the caller.  This method is only supported if pg is the
        # underlying ruby driver.  This method should only be called if you want
        # results returned to the client.  If you are using +COPY TO+
        # with a filename, you should just use +run+ instead of this method.
        #
        # The table argument supports the following types:
        #
        # String :: Uses the first argument directly as literal SQL. If you are using
        #           a version of PostgreSQL before 9.0, you will probably want to
        #           use a string if you are using any options at all, as the syntax
        #           Sequel uses for options is only compatible with PostgreSQL 9.0+.
        #           This should be the full COPY statement passed to PostgreSQL, not
        #           just the SELECT query.  If a string is given, the :format and
        #           :options options are ignored.
        # Dataset :: Uses a query instead of a table name when copying.
        # other :: Uses a table name (usually a symbol) when copying.
        # 
        # The following options are respected:
        #
        # :format :: The format to use.  text is the default, so this should be :csv or :binary.
        # :options :: An options SQL string to use, which should contain comma separated options.
        # :server :: The server on which to run the query.
        #
        # If a block is provided, the method continually yields to the block, one yield
        # per row.  If a block is not provided, a single string is returned with all
        # of the data.
        def copy_table(table, opts=OPTS)
          synchronize(opts[:server]) do |conn|
            conn.execute(copy_table_sql(table, opts))
            begin
              if block_given?
                while buf = conn.get_copy_data
                  yield buf
                end
                b = nil
              else
                b = String.new
                b << buf while buf = conn.get_copy_data
              end

              res = conn.get_last_result
              if !res || res.result_status != 1
                raise PG::NotAllCopyDataRetrieved, "Not all COPY data retrieved"
              end

              b
            rescue => e
              raise_error(e, :disconnect=>true)
            ensure
              if buf && !e
                raise DatabaseDisconnectError, "disconnecting as a partial COPY may leave the connection in an unusable state"
              end
            end
          end 
        end

        # +copy_into+ uses PostgreSQL's +COPY FROM STDIN+ SQL statement to do very fast inserts 
        # into a table using input preformatting in either CSV or PostgreSQL text format.
        # This method is only supported if pg 0.14.0+ is the underlying ruby driver.
        # This method should only be called if you want
        # results returned to the client.  If you are using +COPY FROM+
        # with a filename, you should just use +run+ instead of this method.
        #
        # The following options are respected:
        #
        # :columns :: The columns to insert into, with the same order as the columns in the
        #             input data.  If this isn't given, uses all columns in the table.
        # :data :: The data to copy to PostgreSQL, which should already be in CSV or PostgreSQL
        #          text format.  This can be either a string, or any object that responds to
        #          each and yields string.
        # :format :: The format to use.  text is the default, so this should be :csv or :binary.
        # :options :: An options SQL string to use, which should contain comma separated options.
        # :server :: The server on which to run the query.
        #
        # If a block is provided and :data option is not, this will yield to the block repeatedly.
        # The block should return a string, or nil to signal that it is finished.
        def copy_into(table, opts=OPTS)
          data = opts[:data]
          data = Array(data) if data.is_a?(String)

          if block_given? && data
            raise Error, "Cannot provide both a :data option and a block to copy_into"
          elsif !block_given? && !data
            raise Error, "Must provide either a :data option or a block to copy_into"
          end

          synchronize(opts[:server]) do |conn|
            conn.execute(copy_into_sql(table, opts))
            begin
              if block_given?
                while buf = yield
                  conn.put_copy_data(buf)
                end
              else
                data.each{|buff| conn.put_copy_data(buff)}
              end
            rescue Exception => e
              conn.put_copy_end("ruby exception occurred while copying data into PostgreSQL")
            ensure
              conn.put_copy_end unless e
              while res = conn.get_result
                raise e if e
                check_database_errors{res.check}
              end
            end
          end 
        end

        # Listens on the given channel (or multiple channels if channel is an array), waiting for notifications.
        # After a notification is received, or the timeout has passed, stops listening to the channel. Options:
        #
        # :after_listen :: An object that responds to +call+ that is called with the underlying connection after the LISTEN
        #                  statement is sent, but before the connection starts waiting for notifications.
        # :loop :: Whether to continually wait for notifications, instead of just waiting for a single
        #          notification. If this option is given, a block must be provided.  If this object responds to +call+, it is
        #          called with the underlying connection after each notification is received (after the block is called).
        #          If a :timeout option is used, and a callable object is given, the object will also be called if the
        #          timeout expires.  If :loop is used and you want to stop listening, you can either break from inside the
        #          block given to #listen, or you can throw :stop from inside the :loop object's call method or the block.
        # :server :: The server on which to listen, if the sharding support is being used.
        # :timeout :: How long to wait for a notification, in seconds (can provide a float value for fractional seconds).
        #             If this object responds to +call+, it will be called and should return the number of seconds to wait.
        #             If the loop option is also specified, the object will be called on each iteration to obtain a new
        #             timeout value.  If not given or nil, waits indefinitely.
        #
        # This method is only supported if pg is used as the underlying ruby driver.  It returns the
        # channel the notification was sent to (as a string), unless :loop was used, in which case it returns nil.
        # If a block is given, it is yielded 3 arguments:
        # * the channel the notification was sent to (as a string)
        # * the backend pid of the notifier (as an integer),
        # * and the payload of the notification (as a string or nil).
        def listen(channels, opts=OPTS, &block)
          check_database_errors do
            synchronize(opts[:server]) do |conn|
              begin
                channels = Array(channels)
                channels.each do |channel|
                  sql = "LISTEN ".dup
                  dataset.send(:identifier_append, sql, channel)
                  conn.execute(sql)
                end
                opts[:after_listen].call(conn) if opts[:after_listen]
                timeout = opts[:timeout]
                if timeout
                  timeout_block = timeout.respond_to?(:call) ? timeout : proc{timeout}
                end

                if l = opts[:loop]
                  raise Error, 'calling #listen with :loop requires a block' unless block
                  loop_call = l.respond_to?(:call)
                  catch(:stop) do
                    while true
                      t = timeout_block ? [timeout_block.call] : []
                      conn.wait_for_notify(*t, &block)
                      l.call(conn) if loop_call
                    end
                  end
                  nil
                else
                  t = timeout_block ? [timeout_block.call] : []
                  conn.wait_for_notify(*t, &block)
                end
              ensure
                conn.execute("UNLISTEN *")
              end
            end
          end
        end
      end

      private

      # Execute the given SQL string or prepared statement on the connection object.
      def _execute(conn, sql, opts, &block)
        if sql.is_a?(Symbol)
          execute_prepared_statement(conn, sql, opts, &block)
        else
          conn.execute(sql, opts[:arguments], &block)
        end
      end

      # Execute the prepared statement name with the given arguments on the connection.
      def _execute_prepared_statement(conn, ps_name, args, opts)
        conn.exec_prepared(ps_name, args)
      end

      # Add the primary_keys and primary_key_sequences instance variables,
      # so we can get the correct return values for inserted rows.
      def adapter_initialize
        @use_iso_date_format = typecast_value_boolean(@opts.fetch(:use_iso_date_format, true))
        initialize_postgres_adapter
        add_conversion_proc(17, method(:unescape_bytea)) if USES_PG
        add_conversion_proc(1082, TYPE_TRANSLATOR_DATE) if @use_iso_date_format
        self.convert_infinite_timestamps = @opts[:convert_infinite_timestamps]
      end

      # Convert exceptions raised from the block into DatabaseErrors.
      def check_database_errors
        begin
          yield
        rescue => e
          raise_error(e, :classes=>database_error_classes)
        end
      end

      # Set the DateStyle to ISO if configured, for faster date parsing.
      def connection_configuration_sqls(opts=@opts)
        sqls = super
        sqls << "SET DateStyle = 'ISO'" if @use_iso_date_format
        sqls
      end

      if USES_PG
        def unescape_bytea(s)
          ::Sequel::SQL::Blob.new(Adapter.unescape_bytea(s))
        end
      end

      DATABASE_ERROR_CLASSES = [PGError].freeze
      def database_error_classes
        DATABASE_ERROR_CLASSES
      end

      def disconnect_error?(exception, opts)
        super ||
          Adapter::DISCONNECT_ERROR_CLASSES.any?{|klass| exception.is_a?(klass)} ||
          exception.message =~ Adapter::DISCONNECT_ERROR_RE
      end

      def database_exception_sqlstate(exception, opts)
        if exception.respond_to?(:result) && (result = exception.result)
          result.error_field(PGresult::PG_DIAG_SQLSTATE)
        end
      end

      def dataset_class_default
        Dataset
      end

      # Execute the prepared statement with the given name on an available
      # connection, using the given args.  If the connection has not prepared
      # a statement with the given name yet, prepare it.  If the connection
      # has prepared a statement with the same name and different SQL,
      # deallocate that statement first and then prepare this statement.
      # If a block is given, yield the result, otherwise, return the number
      # of rows changed.
      def execute_prepared_statement(conn, name, opts=OPTS, &block)
        ps = prepared_statement(name)
        sql = ps.prepared_sql
        ps_name = name.to_s

        if args = opts[:arguments]
          args = args.map{|arg| bound_variable_arg(arg, conn)}
        end

        unless conn.prepared_statements[ps_name] == sql
          conn.execute("DEALLOCATE #{ps_name}") if conn.prepared_statements.include?(ps_name)
          conn.check_disconnect_errors{log_connection_yield("PREPARE #{ps_name} AS #{sql}", conn){conn.prepare(ps_name, sql)}}
          conn.prepared_statements[ps_name] = sql
        end

        log_sql = "EXECUTE #{ps_name}"
        if ps.log_sql
          log_sql += " ("
          log_sql << sql
          log_sql << ")"
        end

        q = conn.check_disconnect_errors{log_connection_yield(log_sql, conn, args){_execute_prepared_statement(conn, ps_name, args, opts)}}
        begin
          block_given? ? yield(q) : q.cmd_tuples
        ensure
          q.clear if q && q.respond_to?(:clear)
        end
      end

      # Don't log, since logging is done by the underlying connection.
      def log_connection_execute(conn, sql)
        conn.execute(sql)
      end

      def rollback_transaction(conn, opts=OPTS)
        super unless conn.transaction_status == 0
      end
    end
    
    class Dataset < Sequel::Dataset
      include Sequel::Postgres::DatasetMethods

      def fetch_rows(sql)
        return cursor_fetch_rows(sql){|h| yield h} if @opts[:cursor]
        execute(sql){|res| yield_hash_rows(res, fetch_rows_set_cols(res)){|h| yield h}}
      end
      
      # Use a cursor for paging.
      def paged_each(opts=OPTS, &block)
        unless block_given?
          return enum_for(:paged_each, opts)
        end
        use_cursor(opts).each(&block)
      end

      # Uses a cursor for fetching records, instead of fetching the entire result
      # set at once.  Note this uses a transaction around the cursor usage by
      # default and can be changed using `hold: true` as described below.
      # Cursors can be used to process large datasets without holding all rows
      # in memory (which is what the underlying drivers may do by default).
      # Options:
      #
      # :cursor_name :: The name assigned to the cursor (default 'sequel_cursor').
      #                 Nested cursors require different names.
      # :hold :: Declare the cursor WITH HOLD and don't use transaction around the
      #          cursor usage.
      # :rows_per_fetch :: The number of rows per fetch (default 1000).  Higher
      #                    numbers result in fewer queries but greater memory use.
      #
      # Usage:
      #
      #   DB[:huge_table].use_cursor.each{|row| p row}
      #   DB[:huge_table].use_cursor(rows_per_fetch: 10000).each{|row| p row}
      #   DB[:huge_table].use_cursor(cursor_name: 'my_cursor').each{|row| p row}      
      #
      # This is untested with the prepared statement/bound variable support,
      # and unlikely to work with either.
      def use_cursor(opts=OPTS)
        clone(:cursor=>{:rows_per_fetch=>1000}.merge!(opts))
      end

      # Replace the WHERE clause with one that uses CURRENT OF with the given
      # cursor name (or the default cursor name).  This allows you to update a
      # large dataset by updating individual rows while processing the dataset
      # via a cursor:
      #
      #   DB[:huge_table].use_cursor(rows_per_fetch: 1).each do |row|
      #     DB[:huge_table].where_current_of.update(column: ruby_method(row))
      #   end
      def where_current_of(cursor_name='sequel_cursor')
        clone(:where=>Sequel.lit(['CURRENT OF '], Sequel.identifier(cursor_name)))
      end

      if USES_PG
        PREPARED_ARG_PLACEHOLDER = LiteralString.new('$').freeze
        
        # PostgreSQL specific argument mapper used for mapping the named
        # argument hash to a array with numbered arguments.  Only used with
        # the pg driver.
        module ArgumentMapper
          include Sequel::Dataset::ArgumentMapper
          
          protected
          
          # An array of bound variable values for this query, in the correct order.
          def map_to_prepared_args(hash)
            prepared_args.map{|k| hash[k.to_sym]}
          end

          private
          
          def prepared_arg(k)
            y = k
            if i = prepared_args.index(y)
              i += 1
            else
              prepared_args << y
              i = prepared_args.length
            end
            LiteralString.new("#{prepared_arg_placeholder}#{i}")
          end
        end

        BindArgumentMethods = prepared_statements_module(:bind, [ArgumentMapper], %w'execute execute_dui')
        PreparedStatementMethods = prepared_statements_module(:prepare, BindArgumentMethods, %w'execute execute_dui')
        
        private
        
        def bound_variable_modules
          [BindArgumentMethods]
        end

        def prepared_statement_modules
          [PreparedStatementMethods]
        end

        # PostgreSQL uses $N for placeholders instead of ?, so use a $
        # as the placeholder.
        def prepared_arg_placeholder
          PREPARED_ARG_PLACEHOLDER
        end
      end
      
      private
      
      # Generate and execute a procedure call.
      def call_procedure(name, args)
        sql = String.new
        sql << "CALL "
        identifier_append(sql, name)
        literal_append(sql, args)
        with_sql_first(sql)
      end

      # Use a cursor to fetch groups of records at a time, yielding them to the block.
      def cursor_fetch_rows(sql)
        server_opts = {:server=>@opts[:server] || :read_only}
        cursor = @opts[:cursor]
        hold = cursor[:hold]
        cursor_name = quote_identifier(cursor[:cursor_name] || 'sequel_cursor')
        rows_per_fetch = cursor[:rows_per_fetch].to_i

        db.public_send(*(hold ? [:synchronize, server_opts[:server]] : [:transaction, server_opts])) do 
          begin
            execute_ddl("DECLARE #{cursor_name} NO SCROLL CURSOR WITH#{'OUT' unless hold} HOLD FOR #{sql}", server_opts)
            rows_per_fetch = 1000 if rows_per_fetch <= 0
            fetch_sql = "FETCH FORWARD #{rows_per_fetch} FROM #{cursor_name}"
            cols = nil
            # Load columns only in the first fetch, so subsequent fetches are faster
            execute(fetch_sql) do |res|
              cols = fetch_rows_set_cols(res)
              yield_hash_rows(res, cols){|h| yield h}
              return if res.ntuples < rows_per_fetch
            end
            while true
              execute(fetch_sql) do |res|
                yield_hash_rows(res, cols){|h| yield h}
                return if res.ntuples < rows_per_fetch
              end
            end
          rescue Exception => e
            raise
          ensure
            begin
              execute_ddl("CLOSE #{cursor_name}", server_opts)
            rescue
              raise e if e
              raise
            end
          end
        end
      end
      
      # Set the columns based on the result set, and return the array of
      # field numers, type conversion procs, and name symbol arrays.
      def fetch_rows_set_cols(res)
        cols = []
        procs = db.conversion_procs
        res.nfields.times do |fieldnum|
          cols << [procs[res.ftype(fieldnum)], output_identifier(res.fname(fieldnum))]
        end
        self.columns = cols.map{|c| c[1]}
        cols
      end
      
      # Use the driver's escape_bytea
      def literal_blob_append(sql, v)
        sql << "'" << db.synchronize(@opts[:server]){|c| c.escape_bytea(v)} << "'"
      end
      
      # Use the driver's escape_string
      def literal_string_append(sql, v)
        sql << "'" << db.synchronize(@opts[:server]){|c| c.escape_string(v)} << "'"
      end
      
      # For each row in the result set, yield a hash with column name symbol
      # keys and typecasted values.
      def yield_hash_rows(res, cols)
        ntuples = res.ntuples
        recnum = 0
        while recnum < ntuples
          fieldnum = 0
          nfields = cols.length
          converted_rec = {}
          while fieldnum < nfields
            type_proc, fieldsym = cols[fieldnum]
            value = res.getvalue(recnum, fieldnum)
            converted_rec[fieldsym] = (value && type_proc) ? type_proc.call(value) : value
            fieldnum += 1 
          end
          yield converted_rec
          recnum += 1
        end
      end
    end
  end
end

if Sequel::Postgres::USES_PG && !ENV['NO_SEQUEL_PG']
  begin
    require 'sequel_pg'
    if defined?(Gem) &&
       (sequel_pg_spec = Gem.loaded_specs['sequel_pg'] rescue nil) &&
       (sequel_pg_spec.version < Gem::Version.new('1.6.17'))
        raise Sequel::Error, "the installed sequel_pg is too old, please update to at least sequel_pg-1.6.17"
    end
  rescue LoadError
  end
end
