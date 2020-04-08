# frozen-string-literal: true

require_relative '../shared/sqlanywhere'
require_relative 'transactions'

module Sequel
  module JDBC
    drv = [
      lambda{Java::sybase.jdbc4.sqlanywhere.IDriver},
      lambda{Java::ianywhere.ml.jdbcodbc.jdbc4.IDriver},
      lambda{Java::sybase.jdbc.sqlanywhere.IDriver},
      lambda{Java::ianywhere.ml.jdbcodbc.jdbc.IDriver},
      lambda{Java::com.sybase.jdbc4.jdbc.Sybdriver},
      lambda{Java::com.sybase.jdbc3.jdbc.Sybdriver}
    ].each do |class_proc|
      begin
        break class_proc.call
      rescue NameError
      end
    end
    raise(Sequel::AdapterNotFound, "no suitable SQLAnywhere JDBC driver found") unless drv

    Sequel.synchronize do
      DATABASE_SETUP[:sqlanywhere] = proc do |db|
        db.extend(Sequel::JDBC::SqlAnywhere::DatabaseMethods)
        db.convert_smallint_to_bool = true
        db.dataset_class = Sequel::JDBC::SqlAnywhere::Dataset
        drv
      end
    end

    module SqlAnywhere
      module DatabaseMethods
        include Sequel::SqlAnywhere::DatabaseMethods
        include Sequel::JDBC::Transactions

        private

        # Use @@IDENTITY to get the last inserted id
        def last_insert_id(conn, opts=OPTS)
          statement(conn) do |stmt|
            sql = 'SELECT @@IDENTITY'
            rs = log_connection_yield(sql, conn){stmt.executeQuery(sql)}
            rs.next
            rs.getLong(1)
          end
        end
      end

      class Dataset < JDBC::Dataset
        include Sequel::SqlAnywhere::DatasetMethods

        private

        SMALLINT_TYPE = Java::JavaSQL::Types::SMALLINT
        BOOLEAN_METHOD = Object.new
        def BOOLEAN_METHOD.call(r, i)
          v = r.getShort(i)
          v != 0 unless r.wasNull
        end

        def type_convertor(map, meta, type, i)
          if convert_smallint_to_bool && type == SMALLINT_TYPE
            BOOLEAN_METHOD
          else
            super
          end
        end
      end
    end
  end
end
