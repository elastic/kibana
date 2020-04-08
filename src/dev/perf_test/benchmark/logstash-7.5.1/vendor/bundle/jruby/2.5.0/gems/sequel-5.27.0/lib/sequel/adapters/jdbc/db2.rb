# frozen-string-literal: true

Sequel::JDBC.load_driver('com.ibm.db2.jcc.DB2Driver')
require_relative '../shared/db2'
require_relative 'transactions'

module Sequel
  module JDBC
    Sequel.synchronize do
      DATABASE_SETUP[:db2] = proc do |db|
        db.singleton_class.class_eval do
          alias jdbc_schema_parse_table schema_parse_table
          alias jdbc_tables tables
          alias jdbc_views views
          alias jdbc_indexes indexes

          include Sequel::JDBC::DB2::DatabaseMethods

          alias schema_parse_table jdbc_schema_parse_table
          alias tables jdbc_tables
          alias views jdbc_views
          alias indexes jdbc_indexes
          %w'schema_parse_table tables views indexes'.each do |s|
            remove_method(:"jdbc_#{s}")
          end
        end
        db.extend_datasets Sequel::DB2::DatasetMethods
        com.ibm.db2.jcc.DB2Driver
      end
    end

    module DB2
      module DatabaseMethods
        include Sequel::DB2::DatabaseMethods
        include Sequel::JDBC::Transactions

        private

        def set_ps_arg(cps, arg, i)
          case arg
          when Sequel::SQL::Blob
            if use_clob_as_blob
              cps.setString(i, arg)
            else
              super
            end
          else
            super
          end
        end
        
        def last_insert_id(conn, opts=OPTS)
          statement(conn) do |stmt|
            sql = "SELECT IDENTITY_VAL_LOCAL() FROM SYSIBM.SYSDUMMY1"
            rs = log_connection_yield(sql, conn){stmt.executeQuery(sql)}
            rs.next
            rs.getLong(1)
          end
        end
        
        # Primary key indexes appear to be named sqlNNNN on DB2
        def primary_key_index_re
          /\Asql\d+\z/i
        end

        def setup_type_convertor_map
          super
          map = @type_convertor_map
          types = Java::JavaSQL::Types
          map[types::NCLOB] = map[types::CLOB] = method(:convert_clob)
        end

        def convert_clob(r, i)
          if v = r.getClob(i)
            v = v.getSubString(1, v.length)
            v = Sequel::SQL::Blob.new(v) if use_clob_as_blob
            v
          end
        end
      end
    end
  end
end
