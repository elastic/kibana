if !ENV["APPRAISAL_INITIALIZED"] && !ENV["TRAVIS"]
  ENV['BUNDLE_GEMFILE'] ||= File.expand_path('../Gemfile', __FILE__)
end
require 'rubygems'
require 'bundler/setup'

require 'rake/testtask'
require 'rspec/core/rake_task'

desc "Build a gem file"
task :build do
  system "gem build mail.gemspec"
end

task :default => :spec

RSpec::Core::RakeTask.new(:spec) do |t|
  t.ruby_opts = '-w'
  t.rspec_opts = %w(--backtrace --color)
end

begin
  require "appraisal"
rescue LoadError, SyntaxError
  warn "Appraisal is only available in test/development on Ruby 1.9+"
end

# load custom rake tasks
Dir["#{File.dirname(__FILE__)}/tasks/**/*.rake"].sort.each { |ext| load ext }
