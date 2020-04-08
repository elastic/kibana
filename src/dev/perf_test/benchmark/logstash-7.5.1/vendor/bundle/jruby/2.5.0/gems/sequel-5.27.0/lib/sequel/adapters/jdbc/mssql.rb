# frozen-string-literal: true

require_relative '../shared/mssql'

module Sequel
  module JDBC
    module MSSQL
      module DatabaseMethods
        include Sequel::MSSQL::DatabaseMethods
        
        private
        
        # Get the last inserted id using SCOPE_IDENTITY().
        def last_insert_id(conn, opts=OPTS)
          statement(conn) do |stmt|
            sql = opts[:prepared] ? 'SELECT @@IDENTITY' : 'SELECT SCOPE_IDENTITY()'
            rs = log_connection_yield(sql, conn){stmt.executeQuery(sql)}
            rs.next
            rs.getLong(1)
          end
        end
        
        # Primary key indexes appear to start with pk__ on MSSQL
        def primary_key_index_re
          /\Apk__/i
        end
      end
    end
  end
end
