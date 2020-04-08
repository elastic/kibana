require 'logger'
require_relative "../sequel_warning"

if ENV['COVERAGE']
  require_relative "../sequel_coverage"
  SimpleCov.sequel_coverage(:group=>%r{lib/sequel/adapters})
end

$:.unshift(File.join(File.dirname(File.expand_path(__FILE__)), "../../lib/"))
require_relative "../../lib/sequel"

begin
  require_relative "../spec_config" unless defined?(DB)
rescue LoadError
end
Sequel::Deprecation.backtrace_filter = lambda{|line, lineno| lineno < 4 || line =~ /_(spec|test)\.rb/}

Sequel::DB = nil unless Sequel.constants.include?(:DB)
Sequel.split_symbols = true if ENV['SEQUEL_SPLIT_SYMBOLS']
Sequel::Database.extension :columns_introspection if ENV['SEQUEL_COLUMNS_INTROSPECTION']
Sequel::Model.cache_associations = false if ENV['SEQUEL_NO_CACHE_ASSOCIATIONS']
Sequel::Model.plugin :prepared_statements if ENV['SEQUEL_MODEL_PREPARED_STATEMENTS']
Sequel::Model.plugin :throw_failures if ENV['SEQUEL_MODEL_THROW_FAILURES']
Sequel::Model.use_transactions = false
Sequel::Model.cache_anonymous_models = false

require_relative '../guards_helper'

DB = Sequel.connect(ENV['SEQUEL_INTEGRATION_URL']) unless defined?(DB)

IDENTIFIER_MANGLING = !!ENV['SEQUEL_IDENTIFIER_MANGLING'] unless defined?(IDENTIFIER_MANGLING)
DB.extension(:identifier_mangling) if IDENTIFIER_MANGLING

if DB.adapter_scheme == :ibmdb || (DB.adapter_scheme == :ado && DB.database_type == :access)
  def DB.drop_table(*tables)
    super
  rescue Sequel::DatabaseError
    disconnect
    super
  end
end

DB.extension :index_caching if ENV['SEQUEL_INDEX_CACHING']
DB.extension :error_sql if ENV['SEQUEL_ERROR_SQL']
DB.extension :synchronize_sql if ENV['SEQUEL_SYNCHRONIZE_SQL']
DB.extension :integer64 if ENV['SEQUEL_INTEGER64']

if ENV['SEQUEL_CONNECTION_VALIDATOR']
  ENV['SEQUEL_NO_CHECK_SQLS'] = '1'
  DB.extension(:connection_validator)
  DB.pool.connection_validation_timeout = -1
end

if dch = ENV['SEQUEL_DUPLICATE_COLUMNS_HANDLER']
  DB.extension :duplicate_columns_handler
  DB.opts[:on_duplicate_columns] = dch.to_sym unless dch.empty?
end

if ENV['SEQUEL_FREEZE_DATABASE']
  DB.extension(:constraint_validations, :string_agg, :date_arithmetic)
  DB.extension(:pg_array) if DB.database_type == :postgres
  DB.freeze
end

version = if DB.respond_to?(:server_version)
  DB.server_version
elsif DB.respond_to?(:sqlite_version)
  DB.sqlite_version
end

puts "running #{defined?(SEQUEL_ADAPTER_TEST) ? SEQUEL_ADAPTER_TEST : "integration (database type: #{DB.database_type})"} specs on #{RUBY_ENGINE} #{defined?(JRUBY_VERSION) ? JRUBY_VERSION : RUBY_VERSION} with #{DB.adapter_scheme} adapter#{" (database version: #{version})" if version}"
