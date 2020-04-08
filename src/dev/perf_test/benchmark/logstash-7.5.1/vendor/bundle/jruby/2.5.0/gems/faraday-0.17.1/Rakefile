# frozen_string_literal: true

require 'rake/testtask'
require 'rspec/core/rake_task'

RSpec::Core::RakeTask.new(:spec)

task :default => :test

desc "Run all tests"
task :test => :spec do
  exec 'script/test'
end
