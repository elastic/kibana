# frozen-string-literal: true

require 'sqlanywhere'
require_relative 'shared/sqlanywhere'

module Sequel
  module SqlAnywhere

    class SQLAnywhereException < StandardError
      attr_reader :errno
      attr_reader :sql

      def initialize(message, errno, sql)
        super(message)
        @errno = errno
        @sql = sql
      end
    end

    boolean = Object.new
    def boolean.call(s)
      s.to_i != 0
    end

    date = Object.new
    def date.call(s)
      ::Date.strptime(s)
    end

    decimal = Object.new
    class << decimal
      alias call BigDecimal
      public :call
    end

    time = Object.new
    def time.call(s)
      ::Sequel.string_to_time(s)
    end

    SQLANYWHERE_TYPES = {}
    {
        [0, 484] => decimal,
        [384] => date,
        [388] => time,
        [500] => boolean,
        [524, 528] => ::Sequel::SQL::Blob
    }.each do |k,v|
      k.each{|n| SQLANYWHERE_TYPES[n] = v}
    end
    SQLANYWHERE_TYPES.freeze

    class Database < Sequel::Database
      include Sequel::SqlAnywhere::DatabaseMethods

      attr_accessor :api

      set_adapter_scheme :sqlanywhere

      def connect(server)
        opts = server_opts(server)
        unless conn_string = opts[:conn_string]
          conn_string = []
          conn_string << "Host=#{opts[:host]}#{":#{opts[:port]}" if opts[:port]}" if opts[:host]
          conn_string << "DBN=#{opts[:database]}" if opts[:database]
          conn_string << "UID=#{opts[:user]}" if opts[:user]
          conn_string << "Password=#{opts[:password]}" if opts[:password]
          conn_string << "CommLinks=#{opts[:commlinks]}" if opts[:commlinks]
          conn_string << "ConnectionName=#{opts[:connection_name]}" if opts[:connection_name]
          conn_string << "CharSet=#{opts[:encoding]}" if opts[:encoding]
          conn_string << "Idle=0" # Prevent the server from disconnecting us if we're idle for >240mins (by default)
          conn_string << nil
          conn_string = conn_string.join(';')
        end

        conn = @api.sqlany_new_connection
        raise LoadError, "Could not connect" unless conn && @api.sqlany_connect(conn, conn_string) == 1

        if Sequel.application_timezone == :utc
          @api.sqlany_execute_immediate(conn, "SET TEMPORARY OPTION time_zone_adjustment=0")
        end

        conn
      end

      def disconnect_connection(c)
        @api.sqlany_disconnect(c)
      end

      def execute_dui(sql, opts=OPTS)
        synchronize(opts[:server]) do |conn|
          _execute(conn, :rows, sql, opts)
        end
      end

      def execute(sql, opts=OPTS, &block)
        synchronize(opts[:server]) do |conn|
          _execute(conn, :select, sql, opts, &block)
        end
      end

      def execute_insert(sql, opts=OPTS)
        synchronize(opts[:server]) do |conn|
          _execute(conn, :insert, sql, opts)
        end
      end

      def freeze
        @conversion_procs.freeze
        super
      end

      private

      def _execute(conn, type, sql, opts)
        unless rs = log_connection_yield(sql, conn){@api.sqlany_execute_direct(conn, sql)}
          result, errstr = @api.sqlany_error(conn)
          raise_error(SQLAnywhereException.new(errstr, result, sql))
        end

        case type
        when :select
          yield rs if block_given?
        when :rows
          return @api.sqlany_affected_rows(rs)
        when :insert
          _execute(conn, :select, 'SELECT @@IDENTITY', opts){|r| return @api.sqlany_get_column(r, 0)[1] if r && @api.sqlany_fetch_next(r) == 1}
        end
      ensure
        @api.sqlany_commit(conn) unless in_transaction?
        @api.sqlany_free_stmt(rs) if rs
      end

      def adapter_initialize
        @convert_smallint_to_bool = true
        @conversion_procs = SQLANYWHERE_TYPES.dup
        @conversion_procs[392] = method(:to_application_timestamp_sa)
        @api = SQLAnywhere::SQLAnywhereInterface.new
        raise LoadError, "Could not load SQLAnywhere DBCAPI library" if SQLAnywhere::API.sqlany_initialize_interface(@api) == 0
        raise LoadError, "Could not initialize SQLAnywhere DBCAPI library" if @api.sqlany_init == 0
      end

      def dataset_class_default
        Dataset
      end

      def log_connection_execute(conn, sql)
        _execute(conn, nil, sql, OPTS)
      end
    end

    class Dataset < Sequel::Dataset
      include Sequel::SqlAnywhere::DatasetMethods

      def fetch_rows(sql)
        db = @db
        cps = db.conversion_procs
        api = db.api
        execute(sql) do |rs|
          convert = convert_smallint_to_bool
          col_infos = []
          api.sqlany_num_cols(rs).times do |i|
            _, _, name, _, type = api.sqlany_get_column_info(rs, i)
            cp = if type == 500
              cps[500] if convert
            else
              cps[type]
            end
            col_infos << [output_identifier(name), cp]
          end

          self.columns = col_infos.map(&:first)
          max = col_infos.length

          if rs
            while api.sqlany_fetch_next(rs) == 1
              i = -1
              h = {}
              while (i+=1) < max
                name, cp = col_infos[i]
                v = api.sqlany_get_column(rs, i)[1]
                h[name] = cp && v ? cp.call(v) : v
              end
              yield h
            end
          end
        end
        self
      end
    end
  end
end
