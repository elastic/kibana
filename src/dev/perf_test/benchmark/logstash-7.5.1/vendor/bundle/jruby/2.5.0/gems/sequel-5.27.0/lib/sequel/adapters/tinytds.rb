# frozen-string-literal: true

require 'tiny_tds'
require_relative 'shared/mssql'

module Sequel
  module TinyTDS
    class Database < Sequel::Database
      include Sequel::MSSQL::DatabaseMethods
      set_adapter_scheme :tinytds

      # Transfer the :user option to the :username option.
      def connect(server)
        opts = server_opts(server)
        opts[:username] = opts[:user]
        c = TinyTds::Client.new(opts)
        c.query_options.merge!(:cache_rows=>false)

        if opts[:ansi]
          sql = %w(
            ANSI_NULLS
            ANSI_PADDING
            ANSI_WARNINGS
            ANSI_NULL_DFLT_ON
            QUOTED_IDENTIFIER
            CONCAT_NULL_YIELDS_NULL
          ).map{|v| "SET #{v} ON"}.join(";")
          log_connection_yield(sql, c){c.execute(sql)}
        end

        if (ts = opts[:textsize])
          sql = "SET TEXTSIZE #{typecast_value_integer(ts)}"
          log_connection_yield(sql, c){c.execute(sql)}
        end
      
        c
      end
      
      # Execute the given +sql+ on the server.  If the :return option
      # is present, its value should be a method symbol that is called
      # on the TinyTds::Result object returned from executing the
      # +sql+.  The value of such a method is returned to the caller.
      # Otherwise, if a block is given, it is yielded the result object.
      # If no block is given and a :return is not present, +nil+ is returned.
      def execute(sql, opts=OPTS)
        synchronize(opts[:server]) do |c|
          begin
            m = opts[:return]
            r = nil
            if (args = opts[:arguments]) && !args.empty?
              types = []
              values = []
              args.each_with_index do |(k, v), i|
                v, type = ps_arg_type(v)
                types << "@#{k} #{type}"
                values << "@#{k} = #{v}"
              end
              case m
              when :do
                sql = "#{sql}; SELECT @@ROWCOUNT AS AffectedRows"
                single_value = true
              when :insert
                sql = "#{sql}; SELECT CAST(SCOPE_IDENTITY() AS bigint) AS Ident"
                single_value = true
              end
              sql = "EXEC sp_executesql N'#{c.escape(sql)}', N'#{c.escape(types.join(', '))}', #{values.join(', ')}"
              log_connection_yield(sql, c) do
                r = c.execute(sql)
                r.each{|row| return row.values.first} if single_value
              end
            else
              log_connection_yield(sql, c) do
                r = c.execute(sql)
                return r.public_send(m) if m
              end
            end
            yield(r) if block_given?
          rescue TinyTds::Error => e
            raise_error(e, :disconnect=>!c.active?)
          ensure
            r.cancel if r && c.sqlsent? && c.active?
          end
        end
      end

      def execute_dui(sql, opts=OPTS)
        opts = Hash[opts]
        opts[:return] = :do
        execute(sql, opts)
      end

      def execute_insert(sql, opts=OPTS)
        opts = Hash[opts]
        opts[:return] = :insert
        execute(sql, opts)
      end

      def execute_ddl(sql, opts=OPTS)
        opts = Hash[opts]
        opts[:return] = :each
        execute(sql, opts)
        nil
      end

      private

      # Choose whether to use unicode strings on initialization
      def adapter_initialize
        set_mssql_unicode_strings
      end
      
      # For some reason, unless you specify a column can be
      # NULL, it assumes NOT NULL, so turn NULL on by default unless
      # the column is a primary key column.
      def column_list_sql(g)
        pks = []
        g.constraints.each{|c| pks = c[:columns] if c[:type] == :primary_key} 
        g.columns.each{|c| c[:null] = true if !pks.include?(c[:name]) && !c[:primary_key] && !c.has_key?(:null) && !c.has_key?(:allow_null)}
        super
      end

      # tiny_tds uses TinyTds::Error as the base error class.
      def database_error_classes
        [TinyTds::Error]
      end

      # Stupid MSSQL maps foreign key and check constraint violations
      # to the same error code, and doesn't expose the sqlstate.  Use
      # database error numbers if present and unambiguous, otherwise
      # fallback to the regexp mapping.
      def database_specific_error_class(exception, opts)
        case exception.db_error_number
        when 515
          NotNullConstraintViolation
        when 2627
          UniqueConstraintViolation
        else
          super
        end
      end

      def dataset_class_default
        Dataset
      end

      # Return true if the :conn argument is present and not active.
      def disconnect_error?(e, opts)
        super || (opts[:conn] && !opts[:conn].active?) || ((e.is_a?(::TinyTds::Error) && /\A(Attempt to initiate a new Adaptive Server operation with results pending|The request failed to run because the batch is aborted, this can be caused by abort signal sent from client|Adaptive Server connection timed out)/.match(e.message)))
      end

      # Dispose of any possible results of execution.
      def log_connection_execute(conn, sql)
        log_connection_yield(sql, conn){conn.execute(sql).each}
      end

      # Return a 2 element array with the literal value and type to use
      # in the prepared statement call for the given value and connection.
      def ps_arg_type(v)
        case v
        when Integer
          [v, 'bigint']
        when Float
          [v, 'double precision']
        when Numeric
          [v, 'numeric']
        when Time
          if v.is_a?(SQLTime)
            [literal(v), 'time']
          else
            [literal(v), 'datetime']
          end
        when DateTime
          [literal(v), 'datetime']
        when Date
          [literal(v), 'date']
        when nil
          ['NULL', 'nvarchar(max)']
        when true
          ['1', 'int']
        when false
          ['0', 'int']
        when SQL::Blob
          [literal(v), 'varbinary(max)']
        else
          [literal(v), 'nvarchar(max)']
        end
      end
    end
    
    class Dataset < Sequel::Dataset
      include Sequel::MSSQL::DatasetMethods

      module ArgumentMapper
        include Sequel::Dataset::ArgumentMapper
        
        protected
        
        def map_to_prepared_args(hash)
          args = {}
          hash.each{|k,v| args[k.to_s.gsub('.', '__')] = v}
          args
        end
        
        private
        
        def prepared_arg(k)
          LiteralString.new("@#{k.to_s.gsub('.', '__')}")
        end
      end
      
      PreparedStatementMethods = prepared_statements_module("sql = prepared_sql; opts = Hash[opts]; opts[:arguments] = bind_arguments", ArgumentMapper)
    
      def fetch_rows(sql)
        execute(sql) do |result|
          # Mutating an array in the result is questionable, but supported
          # by tiny_tds developers (tiny_tds issue #57)
          columns = result.fields.map!{|c| output_identifier(c)}
          if columns.empty?
            args = []
            args << {:timezone=>:utc} if db.timezone == :utc
            cols = nil
            result.each(*args) do |r|
              unless cols
                cols = result.fields.map{|c| [c, output_identifier(c)]}
                self.columns = columns = cols.map(&:last)
              end
              h = {}
              cols.each do |s, sym|
                h[sym] = r[s]
              end
              yield h
            end
          else
            self.columns = columns
            if db.timezone == :utc
              result.each(:timezone=>:utc){|r| yield r}
            else
              result.each{|r| yield r}
            end
          end
        end
        self
      end
      
      private
      
      # Properly escape the given string
      def literal_string_append(sql, v)
        sql << (mssql_unicode_strings ? "N'" : "'")
        sql << db.synchronize(@opts[:server]){|c| c.escape(v)}.gsub(/\\((?:\r\n)|\n)/, '\\\\\\\\\\1\\1') << "'"
      end

      def prepared_statement_modules
        [PreparedStatementMethods]
      end
    end
  end
end
