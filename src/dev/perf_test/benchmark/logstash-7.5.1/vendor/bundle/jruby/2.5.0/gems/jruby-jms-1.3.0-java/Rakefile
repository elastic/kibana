require 'rake/clean'
require 'rake/testtask'

raise 'jruby-jms must be built with JRuby' unless defined?(JRUBY_VERSION)

$LOAD_PATH.unshift File.expand_path('../lib', __FILE__)
require 'jms/version'

task :gem do
  system 'gem build jruby-jms.gemspec'
end

task :publish => :gem do
  system "git tag -a v#{JMS::VERSION} -m 'Tagging #{JMS::VERSION}'"
  system 'git push --tags'
  system "gem push jruby-jms-#{JMS::VERSION}-java.gem"
  system "rm jruby-jms-#{JMS::VERSION}-java.gem"
end

desc 'Run Test Suite'
task :test do
  Rake::TestTask.new(:functional) do |t|
    t.test_files = FileList['test/*_test.rb']
    t.verbose    = true
  end

  Rake::Task['functional'].invoke
end

task :default => :test

desc 'Generate RDOC documentation'
task :doc do
  system "rdoc --main README.md --inline-source --quiet README.md `find lib -name '*.rb'`"
end
