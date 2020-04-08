$LOAD_PATH.unshift(File.join(File.dirname(__FILE__), '..', 'lib'))
$LOAD_PATH.unshift(File.dirname(__FILE__))

require 'rubygems'
require 'rr'
require 'test/unit'
class Test::Unit::TestCase
  include RR::Adapters::TestUnit
end

if ENV['SIMPLE_COV']
  require 'simplecov'
  SimpleCov.start do 
    add_filter 'test/'
    add_filter 'pkg/'
    add_filter 'vendor/'
  end
end

require 'test/unit'
