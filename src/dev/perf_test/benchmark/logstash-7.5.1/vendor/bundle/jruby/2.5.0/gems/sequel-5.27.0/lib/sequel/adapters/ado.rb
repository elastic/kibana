# frozen-string-literal: true

require 'win32ole'

module Sequel
  # The ADO adapter provides connectivity to ADO databases in Windows.
  module ADO
    # ADO constants (DataTypeEnum)
    # Source: https://msdn.microsoft.com/en-us/library/ms675318(v=vs.85).aspx
    AdBigInt           = 20
    AdBinary           = 128
    #AdBoolean          = 11
    #AdBSTR             = 8
    #AdChapter          = 136
    #AdChar             = 129
    #AdCurrency         = 6
    #AdDate             = 7
    AdDBDate           = 133
    #AdDBTime           = 134
    AdDBTimeStamp      = 135
    #AdDecimal          = 14
    #AdDouble           = 5
    #AdEmpty            = 0
    #AdError            = 10
    #AdFileTime         = 64
    #AdGUID             = 72
    #AdIDispatch        = 9
    #AdInteger          = 3
    #AdIUnknown         = 13
    AdLongVarBinary    = 205
    #AdLongVarChar      = 201
    #AdLongVarWChar     = 203
    AdNumeric          = 131
    #AdPropVariant      = 138
    #AdSingle           = 4
    #AdSmallInt         = 2
    #AdTinyInt          = 16
    #AdUnsignedBigInt   = 21
    #AdUnsignedInt      = 19
    #AdUnsignedSmallInt = 18
    #AdUnsignedTinyInt  = 17
    #AdUserDefined      = 132
    AdVarBinary        = 204
    #AdVarChar          = 200
    #AdVariant          = 12
    AdVarNumeric       = 139
    #AdVarWChar         = 202
    #AdWChar            = 130

    bigint = Object.new
    def bigint.call(v)
      v.to_i
    end

    numeric = Object.new
    def numeric.call(v)
      if v.include?(',')
        BigDecimal(v.tr(',', '.'))
      else
        BigDecimal(v)
      end
    end

    binary = Object.new
    def binary.call(v)
      Sequel.blob(v.pack('c*'))
    end

    date = Object.new
    def date.call(v)
      Date.new(v.year, v.month, v.day)
    end

    CONVERSION_PROCS = {}
    [
      [bigint, AdBigInt],
      [numeric, AdNumeric, AdVarNumeric],
      [date, AdDBDate],
      [binary, AdBinary, AdVarBinary, AdLongVarBinary]
    ].each do |callable, *types|
      callable.freeze
      types.each do |i|
        CONVERSION_PROCS[i] = callable
      end
    end
    CONVERSION_PROCS.freeze

    class Database < Sequel::Database
      set_adapter_scheme :ado

      attr_reader :conversion_procs

      # In addition to the usual database options,
      # the following options have an effect:
      #
      # :command_timeout :: Sets the time in seconds to wait while attempting
      #                     to execute a command before cancelling the attempt and generating
      #                     an error. Specifically, it sets the ADO CommandTimeout property.
      # :driver :: The driver to use in the ADO connection string.  If not provided, a default
      #            of "SQL Server" is used.
      # :conn_string :: The full ADO connection string.  If this is provided,
      #                 the usual options are ignored.
      # :provider :: Sets the Provider of this ADO connection (for example, "SQLOLEDB").
      #              If you don't specify a provider, the default one used by WIN32OLE
      #              has major problems, such as creating a new native database connection
      #              for every query, which breaks things such as temporary tables.
      #
      # Pay special attention to the :provider option, as without specifying a provider,
      # many things will be broken.  The SQLNCLI10 provider appears to work well if you
      # are connecting to Microsoft SQL Server, but it is not the default as that is not
      # always available and would break backwards compatability.
      def connect(server)
        opts = server_opts(server)
        s = opts[:conn_string] || "driver=#{opts[:driver]};server=#{opts[:host]};database=#{opts[:database]}#{";uid=#{opts[:user]};pwd=#{opts[:password]}" if opts[:user]}"
        handle = WIN32OLE.new('ADODB.Connection')
        handle.CommandTimeout = opts[:command_timeout] if opts[:command_timeout]
        handle.Provider = opts[:provider] if opts[:provider]
        handle.Open(s)
        handle
      end
      
      def disconnect_connection(conn)
        conn.Close
      rescue WIN32OLERuntimeError
        nil
      end

      def freeze
        @conversion_procs.freeze
        super
      end

      # Just execute so it doesn't attempt to return the number of rows modified.
      def execute_ddl(sql, opts=OPTS)
        execute(sql, opts)
      end

      # Just execute so it doesn't attempt to return the number of rows modified.
      def execute_insert(sql, opts=OPTS)
        execute(sql, opts)
      end
      
      # Use pass by reference in WIN32OLE to get the number of affected rows,
      # unless is a provider is in use (since some providers don't seem to
      # return the number of affected rows, but the default provider appears
      # to).
      def execute_dui(sql, opts=OPTS)
        return super if opts[:provider]
        synchronize(opts[:server]) do |conn|
          begin
            log_connection_yield(sql, conn){conn.Execute(sql, 1)}
            WIN32OLE::ARGV[1]
          rescue ::WIN32OLERuntimeError => e
            raise_error(e)
          end
        end
      end

      def execute(sql, opts=OPTS)
        synchronize(opts[:server]) do |conn|
          begin
            r = log_connection_yield(sql, conn){conn.Execute(sql)}
            begin
              yield r if block_given?
            ensure
              begin
                r.close
              rescue ::WIN32OLERuntimeError
              end
            end
          rescue ::WIN32OLERuntimeError => e
            raise_error(e)
          end
        end
        nil
      end

      private
      
      def adapter_initialize
        case @opts[:conn_string]
        when /Microsoft\.(Jet|ACE)\.OLEDB/io
          require_relative 'ado/access'
          extend Sequel::ADO::Access::DatabaseMethods
          self.dataset_class = ADO::Access::Dataset
        else
          @opts[:driver] ||= 'SQL Server'
          case @opts[:driver]
          when 'SQL Server'
            require_relative 'ado/mssql'
            extend Sequel::ADO::MSSQL::DatabaseMethods
            self.dataset_class = ADO::MSSQL::Dataset
            set_mssql_unicode_strings
          end
        end

        @conversion_procs = CONVERSION_PROCS.dup

        super
      end

      def dataset_class_default
        Dataset
      end

      # The ADO adapter's default provider doesn't support transactions, since it 
      # creates a new native connection for each query.  So Sequel only attempts
      # to use transactions if an explicit :provider is given.
      def begin_transaction(conn, opts=OPTS)
        super if @opts[:provider]
      end

      def commit_transaction(conn, opts=OPTS)
        super if @opts[:provider]
      end

      def database_error_classes
        [::WIN32OLERuntimeError]
      end

      def disconnect_error?(e, opts)
        super || (e.is_a?(::WIN32OLERuntimeError) && e.message =~ /Communication link failure/)
      end

      def rollback_transaction(conn, opts=OPTS)
        super if @opts[:provider]
      end
    end
    
    class Dataset < Sequel::Dataset
      def fetch_rows(sql)
        execute(sql) do |recordset|
          cols = []
          conversion_procs = db.conversion_procs

          ts_cp = nil
          recordset.Fields.each do |field|
            type = field.Type
            cp = if type == AdDBTimeStamp
              ts_cp ||= begin
                nsec_div = 1000000000.0/(10**(timestamp_precision))
                nsec_mul = 10**(timestamp_precision+3)
                meth = db.method(:to_application_timestamp)
                lambda do |v|
                  # Fractional second handling is not correct on ruby <2.2
                  meth.call([v.year, v.month, v.day, v.hour, v.min, v.sec, (v.nsec/nsec_div).round * nsec_mul])
                end
              end
            else
              conversion_procs[type]
            end
            cols << [output_identifier(field.Name), cp]
          end

          self.columns = cols.map(&:first)
          return if recordset.EOF
          max = cols.length

          recordset.GetRows.transpose.each do |field_values|
            h = {}

            i = -1
            while (i += 1) < max
              name, cp = cols[i]
              h[name] = if (v = field_values[i]) && cp
                cp.call(v)
              else
                v
              end
            end
            
            yield h
          end
        end
      end
      
      # ADO can return for for delete and update statements, depending on the provider.
      def provides_accurate_rows_matched?
        false
      end
    end
  end
end
