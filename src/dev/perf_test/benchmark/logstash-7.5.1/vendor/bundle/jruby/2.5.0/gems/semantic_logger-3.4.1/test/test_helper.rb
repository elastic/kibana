# Allow test to be run in-place without requiring a gem install
$LOAD_PATH.unshift File.dirname(__FILE__) + '/../lib'

# Configure Rails Environment
ENV['RAILS_ENV'] = 'test'

require 'minitest/autorun'
require 'minitest/reporters'
require 'minitest/stub_any_instance'
require 'semantic_logger'
require 'logger'
require_relative 'mock_logger'
require 'awesome_print'

#Minitest::Reporters.use! Minitest::Reporters::SpecReporter.new
