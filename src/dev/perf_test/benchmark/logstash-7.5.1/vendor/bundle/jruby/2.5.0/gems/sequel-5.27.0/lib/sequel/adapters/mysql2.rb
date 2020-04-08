# frozen-string-literal: true

require 'mysql2'
require_relative 'utils/mysql_mysql2'

module Sequel
  module Mysql2
    NativePreparedStatements = if ::Mysql2::VERSION >= '0.4'
      true
    else
      require_relative 'utils/mysql_prepared_statements'
      false
    end

    class Database < Sequel::Database
      include Sequel::MySQL::DatabaseMethods
      include Sequel::MySQL::MysqlMysql2::DatabaseMethods
      include Sequel::MySQL::PreparedStatements::DatabaseMethods unless NativePreparedStatements

      set_adapter_scheme :mysql2
      
      # Whether to convert tinyint columns to bool for this database
      attr_accessor :convert_tinyint_to_bool

      # Connect to the database.  In addition to the usual database options,
      # the following options have effect:
      #
      # :auto_is_null :: Set to true to use MySQL default behavior of having
      #                  a filter for an autoincrement column equals NULL to return the last
      #                  inserted row.
      # :charset :: Same as :encoding (:encoding takes precendence)
      # :encoding :: Set all the related character sets for this
      #              connection (connection, client, database, server, and results).
      #
      # The options hash is also passed to mysql2, and can include mysql2
      # options such as :local_infile.
      def connect(server)
        opts = server_opts(server)
        opts[:username] ||= opts.delete(:user)
        opts[:flags] ||= 0
        opts[:flags] |= ::Mysql2::Client::FOUND_ROWS if ::Mysql2::Client.const_defined?(:FOUND_ROWS)
        opts[:encoding] ||= opts[:charset]
        conn = ::Mysql2::Client.new(opts)
        conn.query_options.merge!(:symbolize_keys=>true, :cache_rows=>false)
          
        if NativePreparedStatements
          conn.instance_variable_set(:@sequel_default_query_options, conn.query_options.dup)
        end

        sqls = mysql_connection_setting_sqls

        # Set encoding a slightly different way after connecting,
        # in case the READ_DEFAULT_GROUP overrode the provided encoding.
        # Doesn't work across implicit reconnects, but Sequel doesn't turn on
        # that feature.
        if encoding = opts[:encoding]
          sqls.unshift("SET NAMES #{conn.escape(encoding.to_s)}")
        end

        sqls.each{|sql| log_connection_yield(sql, conn){conn.query(sql)}}

        add_prepared_statements_cache(conn)
        conn
      end

      def execute_dui(sql, opts=OPTS)
        execute(sql, opts){|c| return c.affected_rows}
      end

      def execute_insert(sql, opts=OPTS)
        execute(sql, opts){|c| return c.last_id}
      end

      def freeze
        server_version
        super
      end

      # Return the version of the MySQL server to which we are connecting.
      def server_version(_server=nil)
        @server_version ||= super()
      end

      private

      if NativePreparedStatements
        # Use a native mysql2 prepared statement to implement prepared statements.
        def execute_prepared_statement(ps_name, opts, &block)
          ps = prepared_statement(ps_name)
          sql = ps.prepared_sql

          synchronize(opts[:server]) do |conn|
            stmt, ps_sql = conn.prepared_statements[ps_name]
            unless ps_sql == sql
              stmt.close if stmt
              stmt = log_connection_yield(conn, "Preparing #{ps_name}: #{sql}"){conn.prepare(sql)}
              conn.prepared_statements[ps_name] = [stmt, sql]
            end

            if ps.log_sql
              opts = Hash[opts]
              opts = opts[:log_sql] = " (#{sql})"
            end

            _execute(conn, stmt, opts, &block)
          end
        end
      end

      # Execute the given SQL on the given connection.  If the :type
      # option is :select, yield the result of the query, otherwise
      # yield the connection if a block is given.
      def _execute(conn, sql, opts)
        begin
          stream = opts[:stream]
          if NativePreparedStatements
            if args = opts[:arguments]
              args = args.map{|arg| bound_variable_value(arg)}
            end

            case sql
            when ::Mysql2::Statement
              stmt = sql
            when Dataset
              sql = sql.sql
              close_stmt = true
              stmt = conn.prepare(sql)
            end
          end

          r = log_connection_yield((log_sql = opts[:log_sql]) ? sql + log_sql : sql, conn, args) do
            if stmt
              conn.query_options.merge!(:cache_rows=>true, :database_timezone => timezone, :application_timezone => Sequel.application_timezone, :stream=>stream, :cast_booleans=>convert_tinyint_to_bool)
              stmt.execute(*args)
            else
              conn.query(sql, :database_timezone => timezone, :application_timezone => Sequel.application_timezone, :stream=>stream)
            end
          end
          if opts[:type] == :select
            if r
              if stream
                begin
                  r2 = yield r
                ensure
                  # If r2 is nil, it means the block did not exit normally,
                  # so the rest of the results must be drained to prevent
                  # "commands out of sync" errors.
                  r.each{} unless r2
                end
              else
                yield r
              end
            end
          elsif block_given?
            yield conn
          end
        rescue ::Mysql2::Error => e
          raise_error(e)
        ensure
          if stmt
            conn.query_options.replace(conn.instance_variable_get(:@sequel_default_query_options))
            stmt.close if close_stmt
          end
        end
      end

      # Set the convert_tinyint_to_bool setting based on the default value.
      def adapter_initialize
        self.convert_tinyint_to_bool = true
      end

      if NativePreparedStatements
        # Handle bound variable arguments that Mysql2 does not handle natively.
        def bound_variable_value(arg)
          case arg
          when true
            1
          when false
            0
          when DateTime, Time
            literal(arg)[1...-1]
          else
            arg
          end
        end
      end

      def connection_execute_method
        :query
      end

      def database_error_classes
        [::Mysql2::Error]
      end

      def database_exception_sqlstate(exception, opts)
        state = exception.sql_state
        state unless state == 'HY000'
      end

      def dataset_class_default
        Dataset
      end

      # If a connection object is available, try pinging it.  Otherwise, if the
      # error is a Mysql2::Error, check the SQL state and exception message for
      # disconnects.
      def disconnect_error?(e, opts)
        super ||
          ((conn = opts[:conn]) && !conn.ping) ||
          (e.is_a?(::Mysql2::Error) &&
            (e.sql_state =~ /\A08/ ||
             MYSQL_DATABASE_DISCONNECT_ERRORS.match(e.message)))
      end

      # Convert tinyint(1) type to boolean if convert_tinyint_to_bool is true
      def schema_column_type(db_type)
        convert_tinyint_to_bool && db_type =~ /\Atinyint\(1\)/ ? :boolean : super
      end
    end

    class Dataset < Sequel::Dataset
      include Sequel::MySQL::DatasetMethods
      include Sequel::MySQL::MysqlMysql2::DatasetMethods
      include Sequel::MySQL::PreparedStatements::DatasetMethods unless NativePreparedStatements
      STREAMING_SUPPORTED = ::Mysql2::VERSION >= '0.3.12'

      if NativePreparedStatements
        PreparedStatementMethods = prepared_statements_module(
          "sql = self; opts = Hash[opts]; opts[:arguments] = bind_arguments",
          Sequel::Dataset::UnnumberedArgumentMapper,
          %w"execute execute_dui execute_insert")
      end

      def fetch_rows(sql)
        execute(sql) do |r|
          self.columns = r.fields.map!{|c| output_identifier(c.to_s)}
          r.each(:cast_booleans=>convert_tinyint_to_bool?){|h| yield h}
        end
        self
      end

      # Use streaming to implement paging if Mysql2 supports it and
      # it hasn't been disabled.
      def paged_each(opts=OPTS, &block)
        if STREAMING_SUPPORTED && opts[:stream] != false
          unless block_given?
            return enum_for(:paged_each, opts)
          end
          stream.each(&block)
        else
          super
        end
      end

      # Return a clone of the dataset that will stream rows when iterating
      # over the result set, so it can handle large datasets that
      # won't fit in memory (Requires mysql 0.3.12+ to have an effect).
      def stream
        clone(:stream=>true)
      end

      private

      # Whether to cast tinyint(1) columns to integer instead of boolean.
      # By default, uses the database's convert_tinyint_to_bool
      # setting.  Exists for compatibility with the mysql adapter.
      def convert_tinyint_to_bool?
        @db.convert_tinyint_to_bool
      end

      def execute(sql, opts=OPTS)
        opts = Hash[opts]
        opts[:type] = :select
        opts[:stream] = @opts[:stream]
        super
      end

      if NativePreparedStatements
        def bound_variable_modules
          [PreparedStatementMethods]
        end

        def prepared_statement_modules
          [PreparedStatementMethods]
        end
      end

      # Handle correct quoting of strings using ::Mysql2::Client#escape.
      def literal_string_append(sql, v)
        sql << "'" << db.synchronize(@opts[:server]){|c| c.escape(v)} << "'"
      end
    end
  end
end
