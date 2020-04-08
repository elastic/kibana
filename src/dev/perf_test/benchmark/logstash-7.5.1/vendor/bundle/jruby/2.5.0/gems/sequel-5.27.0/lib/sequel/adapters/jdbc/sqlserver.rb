# frozen-string-literal: true

Sequel::JDBC.load_driver('com.microsoft.sqlserver.jdbc.SQLServerDriver')
require_relative 'mssql'

module Sequel
  module JDBC
    Sequel.synchronize do
      DATABASE_SETUP[:sqlserver] = proc do |db|
        db.extend(Sequel::JDBC::SQLServer::DatabaseMethods)
        db.extend_datasets Sequel::MSSQL::DatasetMethods
        db.send(:set_mssql_unicode_strings)
        com.microsoft.sqlserver.jdbc.SQLServerDriver
      end
    end

    module SQLServer
      MSSQL_RUBY_TIME = Object.new
      def MSSQL_RUBY_TIME.call(r, i)
        # MSSQL-Server TIME should be fetched as string to keep the precision intact, see:
        # https://docs.microsoft.com/en-us/sql/t-sql/data-types/time-transact-sql#a-namebackwardcompatibilityfordownlevelclientsa-backward-compatibility-for-down-level-clients
        if v = r.getString(i)
          Sequel.string_to_time("#{v}")
        end
      end

      module DatabaseMethods
        include Sequel::JDBC::MSSQL::DatabaseMethods

        def setup_type_convertor_map
          super
          map = @type_convertor_map
          map[Java::JavaSQL::Types::TIME] = MSSQL_RUBY_TIME

          # Work around constant lazy loading in some drivers
          begin
            dto = Java::MicrosoftSql::Types::DATETIMEOFFSET
          rescue NameError
          end

          if dto
            map[dto] = lambda do |r, i|
              if v = r.getDateTimeOffset(i)
                to_application_timestamp(v.to_s)
              end
            end
          end
        end

        # Work around a bug in SQL Server JDBC Driver 3.0, where the metadata
        # for the getColumns result set specifies an incorrect type for the
        # IS_AUTOINCREMENT column. The column is a string, but the type is
        # specified as a short. This causes getObject() to throw a
        # com.microsoft.sqlserver.jdbc.SQLServerException: "The conversion
        # from char to SMALLINT is unsupported." Using getString() rather
        # than getObject() for this column avoids the problem.
        # Reference: http://social.msdn.microsoft.com/Forums/en/sqldataaccess/thread/20df12f3-d1bf-4526-9daa-239a83a8e435
        module MetadataDatasetMethods
          def type_convertor(map, meta, type, i)
            if output_identifier(meta.getColumnLabel(i)) == :is_autoincrement
              map[Java::JavaSQL::Types::VARCHAR]
            else
              super
            end
          end

          def basic_type_convertor(map, meta, type, i)
            if output_identifier(meta.getColumnLabel(i)) == :is_autoincrement
              map[Java::JavaSQL::Types::VARCHAR]
            else
              super
            end
          end
        end
        
        private

        def _metadata_dataset
          super.with_extend(MetadataDatasetMethods)
        end

        def disconnect_error?(exception, opts)
          super || (exception.message =~ /connection is closed/)
        end
      end
    end
  end
end
