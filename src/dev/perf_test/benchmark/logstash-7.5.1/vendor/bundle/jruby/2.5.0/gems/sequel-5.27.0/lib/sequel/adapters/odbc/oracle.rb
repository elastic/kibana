# frozen-string-literal: true

require_relative '../shared/oracle'

Sequel.synchronize do
  Sequel::ODBC::DATABASE_SETUP[:oracle] = proc do |db|
    db.extend ::Sequel::Oracle::DatabaseMethods
    db.extend_datasets ::Sequel::Oracle::DatasetMethods
  end
end

