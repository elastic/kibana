require_relative "../sequel_warning"

if ENV['COVERAGE']
  require_relative "../sequel_coverage"
  SimpleCov.sequel_coverage(:filter=>%r{lib/sequel/(\w+\.rb|(dataset|database|model|connection_pool)/\w+\.rb|adapters/mock\.rb)\z})
end

$:.unshift(File.join(File.dirname(File.expand_path(__FILE__)), "../../lib/"))
require_relative "../../lib/sequel/core"

ENV['MT_NO_PLUGINS'] = '1' # Work around stupid autoloading of plugins
gem 'minitest'
require 'minitest/global_expectations/autorun'
require 'minitest/hooks/default'
require 'minitest/shared_description'

require_relative '../deprecation_helper'

if ENV['SEQUEL_COLUMNS_INTROSPECTION']
  Sequel.extension :columns_introspection
  Sequel::Database.extension :columns_introspection
  require_relative '../../lib/sequel/adapters/mock'
  Sequel::Mock::Dataset.send(:include, Sequel::ColumnsIntrospection)
end
