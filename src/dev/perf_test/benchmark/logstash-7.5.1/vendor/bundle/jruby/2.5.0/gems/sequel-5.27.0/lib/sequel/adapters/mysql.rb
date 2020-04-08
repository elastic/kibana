# frozen-string-literal: true

require 'mysql'
raise(LoadError, "require 'mysql' did not define Mysql::CLIENT_MULTI_RESULTS!\n  You are probably using the pure ruby mysql.rb driver,\n  which Sequel does not support. You need to install\n  the C based adapter, and make sure that the mysql.so\n  file is loaded instead of the mysql.rb file.\n") unless defined?(Mysql::CLIENT_MULTI_RESULTS)

require_relative 'utils/mysql_mysql2'
require_relative 'utils/mysql_prepared_statements'

module Sequel
  module MySQL
    boolean = Object.new
    def boolean.call(s) s.to_i != 0 end
    TYPE_TRANSLATOR_BOOLEAN = boolean.freeze
    integer = Object.new
    def integer.call(s) s.to_i end
    TYPE_TRANSLATOR_INTEGER = integer.freeze
    float = Object.new
    def float.call(s) s.to_f end

    # Hash with integer keys and callable values for converting MySQL types.
    MYSQL_TYPES = {}
    {
      [0, 246] => ::Kernel.method(:BigDecimal),
      [2, 3, 8, 9, 13, 247, 248] => integer,
      [4, 5] => float,
      [249, 250, 251, 252] => ::Sequel::SQL::Blob
    }.each do |k,v|
      k.each{|n| MYSQL_TYPES[n] = v}
    end
    MYSQL_TYPES.freeze

    class Database < Sequel::Database
      include Sequel::MySQL::DatabaseMethods
      include Sequel::MySQL::MysqlMysql2::DatabaseMethods
      include Sequel::MySQL::PreparedStatements::DatabaseMethods
      
      set_adapter_scheme :mysql

      # Hash of conversion procs for the current database
      attr_reader :conversion_procs

      # Whether to convert tinyint columns to bool for the current database
      attr_reader :convert_tinyint_to_bool

      # By default, Sequel raises an exception if in invalid date or time is used.
      # However, if this is set to nil or :nil, the adapter treats dates
      # like 0000-00-00 and times like 838:00:00 as nil values.  If set to :string,
      # it returns the strings as is.
      attr_reader :convert_invalid_date_time
      
      # Connect to the database.  In addition to the usual database options,
      # the following options have effect:
      #
      # :auto_is_null :: Set to true to use MySQL default behavior of having
      #                  a filter for an autoincrement column equals NULL to return the last
      #                  inserted row.
      # :charset :: Same as :encoding (:encoding takes precendence)
      # :compress :: Set to false to not compress results from the server
      # :config_default_group :: The default group to read from the in
      #                          the MySQL config file.
      # :config_local_infile :: If provided, sets the Mysql::OPT_LOCAL_INFILE
      #                         option on the connection with the given value.
      # :connect_timeout :: Set the timeout in seconds before a connection
      #                     attempt is abandoned.
      # :encoding :: Set all the related character sets for this
      #              connection (connection, client, database, server, and results).
      # :read_timeout :: Set the timeout in seconds for reading back results
      #                  to a query.
      # :socket :: Use a unix socket file instead of connecting via TCP/IP.
      # :timeout :: Set the timeout in seconds before the server will
      #             disconnect this connection (a.k.a @@wait_timeout).
      def connect(server)
        opts = server_opts(server)
        conn = Mysql.init
        conn.options(Mysql::READ_DEFAULT_GROUP, opts[:config_default_group] || "client")
        conn.options(Mysql::OPT_LOCAL_INFILE, opts[:config_local_infile]) if opts.has_key?(:config_local_infile)
        conn.ssl_set(opts[:sslkey], opts[:sslcert], opts[:sslca], opts[:sslcapath], opts[:sslcipher]) if opts[:sslca] || opts[:sslkey]
        if encoding = opts[:encoding] || opts[:charset]
          # Set encoding before connecting so that the mysql driver knows what
          # encoding we want to use, but this can be overridden by READ_DEFAULT_GROUP.
          conn.options(Mysql::SET_CHARSET_NAME, encoding)
        end
        if read_timeout = opts[:read_timeout] and defined? Mysql::OPT_READ_TIMEOUT
          conn.options(Mysql::OPT_READ_TIMEOUT, read_timeout)
        end
        if connect_timeout = opts[:connect_timeout] and defined? Mysql::OPT_CONNECT_TIMEOUT
          conn.options(Mysql::OPT_CONNECT_TIMEOUT, connect_timeout)
        end
        conn.real_connect(
          opts[:host] || 'localhost',
          opts[:user],
          opts[:password],
          opts[:database],
          (opts[:port].to_i if opts[:port]),
          opts[:socket],
          Mysql::CLIENT_MULTI_RESULTS +
          Mysql::CLIENT_MULTI_STATEMENTS +
          (opts[:compress] == false ? 0 : Mysql::CLIENT_COMPRESS)
        )
        sqls = mysql_connection_setting_sqls

        # Set encoding a slightly different way after connecting,
        # in case the READ_DEFAULT_GROUP overrode the provided encoding.
        # Doesn't work across implicit reconnects, but Sequel doesn't turn on
        # that feature.
        sqls.unshift("SET NAMES #{literal(encoding.to_s)}") if encoding

        sqls.each{|sql| log_connection_yield(sql, conn){conn.query(sql)}}

        add_prepared_statements_cache(conn)
        conn
      end
      
      def disconnect_connection(c)
        c.close
      rescue Mysql::Error
        nil
      end
      
      # Modify the type translators for the date, time, and timestamp types
      # depending on the value given.
      def convert_invalid_date_time=(v)
        m0 = ::Sequel.method(:string_to_time)
        @conversion_procs[11] = (v != false) ?  lambda{|val| convert_date_time(val, &m0)} : m0
        m1 = ::Sequel.method(:string_to_date) 
        m = (v != false) ? lambda{|val| convert_date_time(val, &m1)} : m1
        [10, 14].each{|i| @conversion_procs[i] = m}
        m2 = method(:to_application_timestamp)
        m = (v != false) ? lambda{|val| convert_date_time(val, &m2)} : m2
        [7, 12].each{|i| @conversion_procs[i] = m}
        @convert_invalid_date_time = v
      end

      # Modify the type translator used for the tinyint type based
      # on the value given.
      def convert_tinyint_to_bool=(v)
        @conversion_procs[1] = v ? TYPE_TRANSLATOR_BOOLEAN : TYPE_TRANSLATOR_INTEGER
        @convert_tinyint_to_bool = v
      end

      def execute_dui(sql, opts=OPTS)
        execute(sql, opts){|c| return affected_rows(c)}
      end

      def execute_insert(sql, opts=OPTS)
        execute(sql, opts){|c| return c.insert_id}
      end

      def freeze
        server_version
        @conversion_procs.freeze
        super
      end

      # Return the version of the MySQL server to which we are connecting.
      def server_version(server=nil)
        @server_version ||= (synchronize(server){|conn| conn.server_version if conn.respond_to?(:server_version)} || super)
      end

      private
      
      # Execute the given SQL on the given connection.  If the :type
      # option is :select, yield the result of the query, otherwise
      # yield the connection if a block is given.
      def _execute(conn, sql, opts)
        begin
          r = log_connection_yield((log_sql = opts[:log_sql]) ? sql + log_sql : sql, conn){conn.query(sql)}
          if opts[:type] == :select
            yield r if r
          elsif block_given?
            yield conn
          end
          if conn.respond_to?(:more_results?)
            while conn.more_results? do
              if r
                r.free
                r = nil
              end
              begin
                conn.next_result
                r = conn.use_result
              rescue Mysql::Error => e
                raise_error(e, :disconnect=>true) if MYSQL_DATABASE_DISCONNECT_ERRORS.match(e.message)
                break
              end
              yield r if opts[:type] == :select
            end
          end
        rescue Mysql::Error => e
          raise_error(e)
        ensure
          r.free if r
          # Use up all results to avoid a commands out of sync message.
          if conn.respond_to?(:more_results?)
            while conn.more_results? do
              begin
                conn.next_result
                r = conn.use_result
              rescue Mysql::Error => e
                raise_error(e, :disconnect=>true) if MYSQL_DATABASE_DISCONNECT_ERRORS.match(e.message)
                break
              end
              r.free if r
            end
          end
        end
      end
      
      def adapter_initialize
        @conversion_procs = MYSQL_TYPES.dup
        self.convert_tinyint_to_bool = true
        self.convert_invalid_date_time = false
      end

      # Try to get an accurate number of rows matched using the query
      # info.  Fall back to affected_rows if there was no match, but
      # that may be inaccurate.
      def affected_rows(conn)
        s = conn.info
        if s && s =~ /Rows matched:\s+(\d+)\s+Changed:\s+\d+\s+Warnings:\s+\d+/
          $1.to_i
        else
          conn.affected_rows
        end
      end

      # MySQL connections use the query method to execute SQL without a result
      def connection_execute_method
        :query
      end
      
      # If convert_invalid_date_time is nil, :nil, or :string and
      # the conversion raises an InvalidValue exception, return v
      # if :string and nil otherwise.
      def convert_date_time(v)
        begin
          yield v
        rescue InvalidValue
          case @convert_invalid_date_time
          when nil, :nil
            nil
          when :string
            v
          else 
            raise
          end
        end
      end
    
      def database_error_classes
        [Mysql::Error]
      end

      def database_exception_sqlstate(exception, opts)
        exception.sqlstate
      end

      def dataset_class_default
        Dataset
      end

      def disconnect_error?(e, opts)
        super || (e.is_a?(::Mysql::Error) && MYSQL_DATABASE_DISCONNECT_ERRORS.match(e.message))
      end
      
      # Convert tinyint(1) type to boolean if convert_tinyint_to_bool is true
      def schema_column_type(db_type)
        convert_tinyint_to_bool && db_type =~ /\Atinyint\(1\)/ ? :boolean : super
      end
    end
    
    class Dataset < Sequel::Dataset
      include Sequel::MySQL::DatasetMethods
      include Sequel::MySQL::MysqlMysql2::DatasetMethods
      include Sequel::MySQL::PreparedStatements::DatasetMethods

      # Yield all rows matching this dataset.  If the dataset is set to
      # split multiple statements, yield arrays of hashes one per statement
      # instead of yielding results for all statements as hashes.
      def fetch_rows(sql)
        execute(sql) do |r|
          i = -1
          cps = db.conversion_procs
          cols = r.fetch_fields.map do |f| 
            # Pretend tinyint is another integer type if its length is not 1, to
            # avoid casting to boolean if convert_tinyint_to_bool is set.
            type_proc = f.type == 1 && cast_tinyint_integer?(f) ? cps[2] : cps[f.type]
            [output_identifier(f.name), type_proc, i+=1]
          end
          self.columns = cols.map(&:first)
          if opts[:split_multiple_result_sets]
            s = []
            yield_rows(r, cols){|h| s << h}
            yield s
          else
            yield_rows(r, cols){|h| yield h}
          end
        end
        self
      end
      
      # Don't allow graphing a dataset that splits multiple statements
      def graph(*)
        raise(Error, "Can't graph a dataset that splits multiple result sets") if opts[:split_multiple_result_sets]
        super
      end
      
      # Makes each yield arrays of rows, with each array containing the rows
      # for a given result set.  Does not work with graphing.  So you can submit
      # SQL with multiple statements and easily determine which statement
      # returned which results.
      #
      # Modifies the row_proc of the returned dataset so that it still works
      # as expected (running on the hashes instead of on the arrays of hashes).
      # If you modify the row_proc afterward, note that it will receive an array
      # of hashes instead of a hash.
      def split_multiple_result_sets
        raise(Error, "Can't split multiple statements on a graphed dataset") if opts[:graph]
        ds = clone(:split_multiple_result_sets=>true)
        ds = ds.with_row_proc(proc{|x| x.map{|h| row_proc.call(h)}}) if row_proc
        ds
      end
      
      private

      # Whether a tinyint field should be casted as an integer.  By default,
      # casts to integer if the field length is not 1.  Can be overwritten
      # to make tinyint casting dataset dependent.
      def cast_tinyint_integer?(field)
        field.length != 1
      end
      
      def execute(sql, opts=OPTS)
        opts = Hash[opts]
        opts[:type] = :select
        super
      end
      
      # Handle correct quoting of strings using ::MySQL.quote.
      def literal_string_append(sql, v)
        sql << "'" << ::Mysql.quote(v) << "'"
      end
      
      # Yield each row of the given result set r with columns cols
      # as a hash with symbol keys
      def yield_rows(r, cols)
        while row = r.fetch_row
          h = {}
          cols.each{|n, p, i| v = row[i]; h[n] = (v && p) ? p.call(v) : v}
          yield h
        end
      end
    end
  end
end
