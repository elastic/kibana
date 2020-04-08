require_relative "../sequel_warning"

$:.unshift(File.join(File.dirname(File.expand_path(__FILE__)), "../../lib/"))
require_relative "../../lib/sequel"

Sequel::Deprecation.backtrace_filter = lambda{|line, lineno| lineno < 4 || line =~ /_spec\.rb/}

ENV['MT_NO_PLUGINS'] = '1' # Work around stupid autoloading of plugins
gem 'minitest'
require 'minitest/global_expectations/autorun'
require 'minitest/hooks/default'

require_relative '../deprecation_helper'

class << Sequel::Model
  attr_writer :db_schema
  alias orig_columns columns
  def columns(*cols)
    return super if cols.empty?
    define_method(:columns){cols}
    @dataset.send(:columns=, cols) if @dataset
    def_column_accessor(*cols)
    @columns = cols
    @db_schema = {}
    cols.each{|c| @db_schema[c] = {}}
  end
end

Sequel::DB = nil
Sequel::Model.use_transactions = false
Sequel::Model.cache_anonymous_models = false

db = Sequel.mock(:fetch=>{:id => 1, :x => 1}, :numrows=>1, :autoid=>proc{|sql| 10})
def db.schema(*) [[:id, {:primary_key=>true}]] end
def db.reset() sqls end
def db.supports_schema_parsing?() true end
Sequel::Model.db = DB = db

if ENV['SEQUEL_COLUMNS_INTROSPECTION']
  Sequel.extension :columns_introspection
  Sequel::Database.extension :columns_introspection
  Sequel::Mock::Dataset.send(:include, Sequel::ColumnsIntrospection)
end
if ENV['SEQUEL_NO_CACHE_ASSOCIATIONS']
  Sequel::Model.cache_associations = false
end
