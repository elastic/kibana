require 'logger'
require_relative "../sequel_warning"

if ENV['COVERAGE']
  require_relative "../sequel_coverage"
  SimpleCov.sequel_coverage(:group=>%r{lib/sequel/adapters})
end

$:.unshift(File.join(File.dirname(File.expand_path(__FILE__)), "../../lib/"))
require_relative "../../lib/sequel"

begin
  require_relative "../spec_config"
rescue LoadError
end

Sequel::DB = nil
Sequel.split_symbols = true if ENV['SEQUEL_SPLIT_SYMBOLS']
Sequel::Database.extension :duplicate_column_handler if ENV['SEQUEL_DUPLICATE_COLUMN_HANDLER']
Sequel::Database.extension :columns_introspection if ENV['SEQUEL_COLUMNS_INTROSPECTION']
Sequel::Model.cache_associations = false if ENV['SEQUEL_NO_CACHE_ASSOCIATIONS']
Sequel::Model.plugin :prepared_statements if ENV['SEQUEL_MODEL_PREPARED_STATEMENTS']
Sequel::Model.plugin :throw_failures if ENV['SEQUEL_MODEL_THROW_FAILURES']
Sequel::Model.cache_anonymous_models = false

require_relative '../guards_helper'

unless defined?(DB)
  env_var = "SEQUEL_#{SEQUEL_ADAPTER_TEST.to_s.upcase}_URL"
  env_var = ENV.has_key?(env_var) ? env_var : 'SEQUEL_INTEGRATION_URL'
  DB = Sequel.connect(ENV[env_var])
end

IDENTIFIER_MANGLING = !!ENV['SEQUEL_IDENTIFIER_MANGLING'] unless defined?(IDENTIFIER_MANGLING)
DB.extension(:identifier_mangling) if IDENTIFIER_MANGLING

DB.extension :pg_timestamptz if ENV['SEQUEL_PG_TIMESTAMPTZ']
DB.extension :integer64 if ENV['SEQUEL_INTEGER64']
DB.extension :index_caching if ENV['SEQUEL_INDEX_CACHING']

if dch = ENV['SEQUEL_DUPLICATE_COLUMNS_HANDLER']
  DB.extension :duplicate_columns_handler
  DB.opts[:on_duplicate_columns] = dch.to_sym unless dch.empty?
end
