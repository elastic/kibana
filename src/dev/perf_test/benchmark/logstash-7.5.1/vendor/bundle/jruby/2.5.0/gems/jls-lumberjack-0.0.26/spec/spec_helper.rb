# encoding: utf-8
require 'rspec'
require 'rspec/mocks'
require 'rspec/wait'

$: << File.realpath(File.join(File.dirname(__FILE__), "..", "lib"))

RSpec.configure do |config|
  config.order = :rand
end
