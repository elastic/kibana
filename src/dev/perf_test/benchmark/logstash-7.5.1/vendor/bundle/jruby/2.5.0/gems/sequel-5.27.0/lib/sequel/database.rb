# frozen-string-literal: true

module Sequel
  # Hash of adapters that have been used. The key is the adapter scheme
  # symbol, and the value is the Database subclass.
  ADAPTER_MAP = {}
    
  # Hash of shared adapters that have been registered.  The key is the
  # adapter scheme symbol, and the value is the Sequel module containing
  # the shared adapter.
  SHARED_ADAPTER_MAP = {}

  # Array of all databases to which Sequel has connected.  If you are
  # developing an application that can connect to an arbitrary number of 
  # databases, delete the database objects from this (or use the :keep_reference
  # Database option or a block when connecting) or they will not get
  # garbage collected.
  DATABASES = []

  # A Database object represents a virtual connection to a database.
  # The Database class is meant to be subclassed by database adapters in order
  # to provide the functionality needed for executing queries.
  class Database
    OPTS = Sequel::OPTS
  end

  require_relative "database/connecting"
  require_relative "database/dataset"
  require_relative "database/dataset_defaults"
  require_relative "database/logging"
  require_relative "database/features"
  require_relative "database/misc"
  require_relative "database/query"
  require_relative "database/transactions"
  require_relative "database/schema_generator"
  require_relative "database/schema_methods"
end
