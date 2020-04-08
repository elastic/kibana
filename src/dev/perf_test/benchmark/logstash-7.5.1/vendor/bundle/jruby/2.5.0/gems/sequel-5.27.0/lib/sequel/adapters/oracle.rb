# frozen-string-literal: true

require 'oci8'
require_relative 'shared/oracle'

module Sequel
  module Oracle
    class Database < Sequel::Database
      include DatabaseMethods
      set_adapter_scheme :oracle

      # ORA-00028: your session has been killed
      # ORA-01012: not logged on
      # ORA-02396: exceeded maximum idle time, please connect again
      # ORA-03113: end-of-file on communication channel
      # ORA-03114: not connected to ORACLE
      CONNECTION_ERROR_CODES = [ 28, 1012, 2396, 3113, 3114 ].freeze
      
      ORACLE_TYPES = {
        :blob=>lambda{|b| Sequel::SQL::Blob.new(b.read)},
        :clob=>:read.to_proc
      }.freeze

      # Hash of conversion procs for this database.
      attr_reader :conversion_procs

      def connect(server)
        opts = server_opts(server)
        if opts[:database]
          dbname = opts[:host] ? \
            "//#{opts[:host]}#{":#{opts[:port]}" if opts[:port]}/#{opts[:database]}" : opts[:database]
        else
          dbname = opts[:host]
        end
        conn = OCI8.new(opts[:user], opts[:password], dbname, opts[:privilege])
        if prefetch_rows = opts.fetch(:prefetch_rows, 100)
          conn.prefetch_rows = typecast_value_integer(prefetch_rows)
        end
        conn.autocommit = true
        conn.non_blocking = true
        
        # The ruby-oci8 gem which retrieves oracle columns with a type of
        # DATE, TIMESTAMP, TIMESTAMP WITH TIME ZONE is complex based on the
        # ruby version and Oracle version (9 or later)
        # In the now standard case of Oracle 9 or later, the timezone
        # is determined by the Oracle session timezone. Thus if the user
        # requests Sequel provide UTC timezone to the application,
        # we need to alter the session timezone to be UTC
        if Sequel.application_timezone == :utc
          conn.exec("ALTER SESSION SET TIME_ZONE='-00:00'")
        end
        
        class << conn
          attr_reader :prepared_statements
        end
        conn.instance_variable_set(:@prepared_statements, {})
        
        conn
      end

      def disconnect_connection(c)
        c.logoff
      rescue OCIException
        nil
      end

      def execute(sql, opts=OPTS, &block)
        _execute(nil, sql, opts, &block)
      end

      def execute_insert(sql, opts=OPTS)
        _execute(:insert, sql, opts)
      end

      def freeze
        @conversion_procs.freeze
        super
      end

      private

      def _execute(type, sql, opts=OPTS, &block)
        synchronize(opts[:server]) do |conn|
          begin
            return execute_prepared_statement(conn, type, sql, opts, &block) if sql.is_a?(Symbol)
            if args = opts[:arguments]
              r = conn.parse(sql)
              args = cursor_bind_params(conn, r, args)
              nr = log_connection_yield(sql, conn, args){r.exec}
              r = nr unless block_given?
            else
              r = log_connection_yield(sql, conn){conn.exec(sql)}
            end
            if block_given?
              yield(r)
            elsif type == :insert
              last_insert_id(conn, opts)
            else
              r
            end
          rescue OCIException, RuntimeError => e
            # ruby-oci8 is naughty and raises strings in some places
            raise_error(e)
          ensure
            r.close if r.is_a?(::OCI8::Cursor)
          end
        end
      end

      def adapter_initialize
        @autosequence = @opts[:autosequence]
        @primary_key_sequences = {}
        @conversion_procs = ORACLE_TYPES.dup
      end

      PS_TYPES = {'string'=>String, 'integer'=>Integer, 'float'=>Float,
        'decimal'=>Float, 'date'=>Time, 'datetime'=>Time,
        'time'=>Time, 'boolean'=>String, 'blob'=>OCI8::BLOB, 'clob'=>OCI8::CLOB}.freeze
      def cursor_bind_params(conn, cursor, args)
        i = 0
        args.map do |arg, type|
          i += 1
          case arg
          when true
            arg = 'Y'
          when false
            arg = 'N'
          when BigDecimal
            arg = arg.to_f
          when ::Sequel::SQL::Blob
            arg = ::OCI8::BLOB.new(conn, arg)
          when String
            if type == 'clob'
              arg = ::OCI8::CLOB.new(conn, arg)
            end
          end
          cursor.bind_param(i, arg, PS_TYPES[type] || arg.class)
          arg
        end
      end

      def connection_execute_method
        :exec
      end

      def database_error_classes
        [OCIException, RuntimeError]
      end

      def database_specific_error_class(exception, opts)
        return super unless exception.respond_to?(:code)
        case exception.code
        when 1400, 1407
          NotNullConstraintViolation
        when 1
          UniqueConstraintViolation
        when 2291, 2292
          ForeignKeyConstraintViolation
        when 2290
          CheckConstraintViolation
        when 8177
          SerializationFailure
        else
          super
        end
      end

      def dataset_class_default
        Dataset
      end

      def execute_prepared_statement(conn, type, name, opts)
        ps = prepared_statement(name)
        sql = ps.prepared_sql
        if cursora = conn.prepared_statements[name]
          cursor, cursor_sql = cursora
          if cursor_sql != sql
            cursor.close
            cursor = nil
          end
        end
        unless cursor
          cursor = log_connection_yield("PREPARE #{name}: #{sql}", conn){conn.parse(sql)}
          conn.prepared_statements[name] = [cursor, sql]
        end
        args = cursor_bind_params(conn, cursor, opts[:arguments])
        log_sql = "EXECUTE #{name}"
        if ps.log_sql
          log_sql += " ("
          log_sql << sql
          log_sql << ")"
        end
        r = log_connection_yield(log_sql, conn, args){cursor.exec}
        if block_given?
          yield(cursor)
        elsif type == :insert
          last_insert_id(conn, opts)
        else
          r
        end
      end

      def last_insert_id(conn, opts)
        unless sequence = opts[:sequence]
          if t = opts[:table]
            sequence = sequence_for_table(t)
          end
        end
        if sequence
          sql = "SELECT #{literal(sequence)}.currval FROM dual"
          begin
            cursor = log_connection_yield(sql, conn){conn.exec(sql)}
            row = cursor.fetch
            row.each{|v| return (v.to_i if v)}
          rescue OCIError
            nil
          ensure
            cursor.close if cursor
          end
        end
      end

      def begin_transaction(conn, opts=OPTS)
        log_connection_yield('Transaction.begin', conn){conn.autocommit = false}
        set_transaction_isolation(conn, opts)
      end
      
      def commit_transaction(conn, opts=OPTS)
        log_connection_yield('Transaction.commit', conn){conn.commit}
      end

      def disconnect_error?(e, opts)
        super || (e.is_a?(::OCIError) && CONNECTION_ERROR_CODES.include?(e.code))
      end
      
      def oracle_column_type(h)
        case h[:oci8_type]
        when :number
          case h[:scale]
          when 0
            :integer
          when -127
            :float
          else
            :decimal
          end
        when :date
          :datetime
        else
          schema_column_type(h[:db_type])
        end
      end

      def remove_transaction(conn, committed)
        conn.autocommit = true
      ensure
        super
      end
      
      def rollback_transaction(conn, opts=OPTS)
        log_connection_yield('Transaction.rollback', conn){conn.rollback}
      end

      def schema_parse_table(table, opts=OPTS)
        schema, table = schema_and_table(table)
        schema ||= opts[:schema]
        schema_and_table = if ds = opts[:dataset]
          ds.literal(schema ? SQL::QualifiedIdentifier.new(schema, table) : SQL::Identifier.new(table))
        else
          "#{"#{quote_identifier(schema)}." if schema}#{quote_identifier(table)}"
        end
        table_schema = []
        m = output_identifier_meth(ds)
        im = input_identifier_meth(ds)

        # Primary Keys
        ds = metadata_dataset.
          from{[all_constraints.as(:cons), all_cons_columns.as(:cols)]}.
          where{{
           cols[:table_name]=>im.call(table),
           cons[:constraint_type]=>'P',
           cons[:constraint_name]=>cols[:constraint_name],
           cons[:owner]=>cols[:owner]}}
        ds = ds.where{{cons[:owner]=>im.call(schema)}} if schema
        pks = ds.select_map{cols[:column_name]}

        # Default values
        defaults = begin
          metadata_dataset.from(:all_tab_cols).
            where(:table_name=>im.call(table)).
            as_hash(:column_name, :data_default)
        rescue DatabaseError
          {}
        end

        metadata = synchronize(opts[:server]) do |conn|
          begin
            log_connection_yield("Connection.describe_table", conn){conn.describe_table(schema_and_table)}
          rescue OCIError => e
            raise_error(e)
          end
        end
        metadata.columns.each do |column|
          h = {
              :primary_key => pks.include?(column.name),
              :default => defaults[column.name],
              :oci8_type => column.data_type,
              :db_type => column.type_string,
              :type_string => column.type_string,
              :charset_form => column.charset_form,
              :char_used => column.char_used?,
              :char_size => column.char_size,
              :data_size => column.data_size,
              :precision => column.precision,
              :scale => column.scale,
              :fsprecision => column.fsprecision,
              :lfprecision => column.lfprecision,
              :allow_null => column.nullable?
          }
          h[:type] = oracle_column_type(h)
          h[:auto_increment] = h[:type] == :integer if h[:primary_key]
          h[:max_length] = h[:char_size] if h[:type] == :string
          table_schema << [m.call(column.name), h]
        end
        table_schema
      end
    end
    
    class Dataset < Sequel::Dataset
      include DatasetMethods

      # Oracle already supports named bind arguments, so use directly.
      module ArgumentMapper
        include Sequel::Dataset::ArgumentMapper
        
        protected
        
        # Return a hash with the same values as the given hash,
        # but with the keys converted to strings.
        def map_to_prepared_args(bind_vars)
          prepared_args.map{|v, t| [bind_vars[v], t]}
        end
        
        private
        
        # Oracle uses a : before the name of the argument for named
        # arguments.
        def prepared_arg(k)
          y, type = k.to_s.split("__", 2)
          prepared_args << [y.to_sym, type]
          i = prepared_args.length
          LiteralString.new(":#{i}")
        end
      end
      
      BindArgumentMethods = prepared_statements_module(:bind, ArgumentMapper)
      PreparedStatementMethods = prepared_statements_module(:prepare, BindArgumentMethods)

      def fetch_rows(sql)
        execute(sql) do |cursor|
          cps = db.conversion_procs
          cols = columns = cursor.get_col_names.map{|c| output_identifier(c)}
          metadata = cursor.column_metadata
          cm = cols.zip(metadata).map{|c, m| [c, cps[m.data_type]]}
          self.columns = columns
          while r = cursor.fetch
            row = {}
            r.zip(cm).each{|v, (c, cp)| row[c] = ((v && cp) ? cp.call(v) : v)}
            yield row
          end
        end
        self
      end

      # Oracle requires type specifiers for placeholders, at least
      # if you ever want to use a nil/NULL value as the value for
      # the placeholder.
      def requires_placeholder_type_specifiers?
        true
      end

      private

      def literal_other_append(sql, v)
        case v
        when OraDate
          literal_append(sql, db.to_application_timestamp(v))
        when OCI8::CLOB
          v.rewind
          literal_append(sql, v.read)
        else
          super
        end
      end

      def prepared_arg_placeholder
        ':'
      end

      def bound_variable_modules
        [BindArgumentMethods]
      end

      def prepared_statement_modules
        [PreparedStatementMethods]
      end
    end
  end
end
