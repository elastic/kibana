# frozen-string-literal: true

require_relative '../shared/mssql'

module Sequel
  module ODBC
    Sequel.synchronize do
      DATABASE_SETUP[:mssql] = proc do |db|
        db.extend Sequel::ODBC::MSSQL::DatabaseMethods
        db.dataset_class = Sequel::ODBC::MSSQL::Dataset
        db.send(:set_mssql_unicode_strings)
      end
    end

    module MSSQL
      module DatabaseMethods
        include Sequel::MSSQL::DatabaseMethods

        def execute_insert(sql, opts=OPTS)
          synchronize(opts[:server]) do |conn|
            begin
              log_connection_yield(sql, conn){conn.do(sql)}
              begin
                last_insert_id_sql = 'SELECT SCOPE_IDENTITY()'
                s = log_connection_yield(last_insert_id_sql, conn){conn.run(last_insert_id_sql)}
                if (rows = s.fetch_all) and (row = rows.first) and (v = row.first)
                  Integer(v)
                end
              ensure
                s.drop if s
              end
            rescue ::ODBC::Error => e
              raise_error(e)
            end
          end
        end
      end
      class Dataset < ODBC::Dataset
        include Sequel::MSSQL::DatasetMethods

        private

        # Use ODBC format, not Microsoft format, as the ODBC layer does
        # some translation, but allow for millisecond precision.
        def default_timestamp_format
          "{ts '%Y-%m-%d %H:%M:%S%N'}"
        end

        # Use ODBC format, not Microsoft format, as the ODBC layer does
        # some translation.
        def literal_date(v)
          v.strftime("{d '%Y-%m-%d'}")
        end
      end
    end
  end
end
