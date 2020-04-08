require 'rake/clean'
require 'rake/testtask'

$LOAD_PATH.unshift File.expand_path("../lib", __FILE__)
require 'semantic_logger/version'

task :gem do
  system 'gem build semantic_logger.gemspec'
end

task publish: :gem do
  system "git tag -a v#{SemanticLogger::VERSION} -m 'Tagging #{SemanticLogger::VERSION}'"
  system 'git push --tags'
  system "gem push semantic_logger-#{SemanticLogger::VERSION}.gem"
  system "rm semantic_logger-#{SemanticLogger::VERSION}.gem"
end

desc 'Run Test Suite'
task :test do
  Rake::TestTask.new(:functional) do |t|
    t.test_files = FileList['test/**/*_test.rb']
    t.verbose    = true
  end

  Rake::Task['functional'].invoke
end

task default: :test
