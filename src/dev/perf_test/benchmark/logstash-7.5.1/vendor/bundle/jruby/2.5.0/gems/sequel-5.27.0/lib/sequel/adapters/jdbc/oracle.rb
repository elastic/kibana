# frozen-string-literal: true

Sequel::JDBC.load_driver('Java::oracle.jdbc.driver.OracleDriver')
require_relative '../shared/oracle'
require_relative 'transactions'

module Sequel
  module JDBC
    Sequel.synchronize do
      DATABASE_SETUP[:oracle] = proc do |db|
        db.extend(Sequel::JDBC::Oracle::DatabaseMethods)
        db.dataset_class = Sequel::JDBC::Oracle::Dataset
        Java::oracle.jdbc.driver.OracleDriver
      end
    end

    module Oracle
      JAVA_BIG_DECIMAL_CONSTRUCTOR = java.math.BigDecimal.java_class.constructor(Java::long).method(:new_instance)
      ORACLE_DECIMAL = Object.new
      def ORACLE_DECIMAL.call(r, i)
        if v = r.getBigDecimal(i)
          i = v.long_value
          if v == JAVA_BIG_DECIMAL_CONSTRUCTOR.call(i)
            i
          else
            ::Kernel::BigDecimal(v.to_string)
          end
        end
      end 

      ORACLE_CLOB = Object.new
      def ORACLE_CLOB.call(r, i)
        return unless clob = r.getClob(i)
        str = clob.getSubString(1, clob.length)
        clob.freeTemporary if clob.isTemporary
        str
      end

      module DatabaseMethods
        include Sequel::Oracle::DatabaseMethods
        include Sequel::JDBC::Transactions

        def self.extended(db)
          db.instance_exec do
            @autosequence = opts[:autosequence]
            @primary_key_sequences = {}
          end
        end
        
        private

        # Oracle exception handling with SQLState is less accurate than with regexps.
        def database_exception_use_sqlstates?
          false
        end

        def disconnect_error?(exception, opts)
          super || exception.message =~ /\AClosed Connection/
        end

        # Default the fetch size for statements to 100, similar to the oci8-based oracle adapter.
        def default_fetch_size
          100
        end
        
        def last_insert_id(conn, opts)
          unless sequence = opts[:sequence]
            if t = opts[:table]
              sequence = sequence_for_table(t)
            end
          end
          if sequence
            sql = "SELECT #{literal(sequence)}.currval FROM dual"
            statement(conn) do |stmt|
              begin
                rs = log_connection_yield(sql, conn){stmt.executeQuery(sql)}
                rs.next
                rs.getLong(1)
              rescue java.sql.SQLException
                nil
              end
            end
          end
        end

        # Primary key indexes appear to start with sys_ on Oracle
        def primary_key_index_re
          /\Asys_/i
        end

        def schema_parse_table(*)
          sch = super
          sch.each do |c, s|
            if s[:type] == :decimal && s[:scale] == -127
              s[:type] = :integer
            elsif s[:db_type] == 'DATE'
              s[:type] = :datetime
            end
          end
          sch
        end

        def schema_parse_table_skip?(h, schema)
          super || (h[:table_schem] != current_user unless schema)
        end

        # As of Oracle 9.2, releasing savepoints is no longer supported.
        def supports_releasing_savepoints?
          false
        end

        def setup_type_convertor_map
          super
          @type_convertor_map[:OracleDecimal] = ORACLE_DECIMAL
          @type_convertor_map[:OracleClob] = ORACLE_CLOB
        end
      end
      
      class Dataset < JDBC::Dataset
        include Sequel::Oracle::DatasetMethods

        NUMERIC_TYPE = Java::JavaSQL::Types::NUMERIC
        TIMESTAMP_TYPE = Java::JavaSQL::Types::TIMESTAMP
        CLOB_TYPE = Java::JavaSQL::Types::CLOB
        TIMESTAMPTZ_TYPES = [Java::oracle.jdbc.OracleTypes::TIMESTAMPTZ, Java::oracle.jdbc.OracleTypes::TIMESTAMPLTZ].freeze

        def type_convertor(map, meta, type, i)
          case type
          when NUMERIC_TYPE
            if meta.getScale(i) == 0
              map[:OracleDecimal]
            else
              super
            end
          when *TIMESTAMPTZ_TYPES
            map[TIMESTAMP_TYPE]
          when CLOB_TYPE 
            map[:OracleClob]
          else
            super
          end
        end
      end
    end
  end
end
