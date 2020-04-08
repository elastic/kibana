# frozen-string-literal: true

Sequel::JDBC.load_driver('Java::net.sourceforge.jtds.jdbc.Driver', :JTDS)
require_relative 'mssql'

module Sequel
  module JDBC
    Sequel.synchronize do
      DATABASE_SETUP[:jtds] = proc do |db|
        db.extend(Sequel::JDBC::JTDS::DatabaseMethods)
        db.extend_datasets Sequel::MSSQL::DatasetMethods
        db.send(:set_mssql_unicode_strings)
        Java::net.sourceforge.jtds.jdbc.Driver
      end
    end

    module JTDS
      module DatabaseMethods
        include Sequel::JDBC::MSSQL::DatabaseMethods

        private

        # JTDS exception handling with SQLState is less accurate than with regexps.
        def database_exception_use_sqlstates?
          false
        end

        def disconnect_error?(exception, opts)
          super || exception.message =~ /\AInvalid state, the Connection object is closed\.\z/
        end

        # Handle nil values by using setNull with the correct parameter type.
        def set_ps_arg_nil(cps, i)
          cps.setNull(i, cps.getParameterMetaData.getParameterType(i))
        end
      end
    end
  end
end
