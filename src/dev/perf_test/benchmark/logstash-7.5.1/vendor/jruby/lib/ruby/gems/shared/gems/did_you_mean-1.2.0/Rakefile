require 'bundler/gem_tasks'
require 'rake/testtask'

Rake::TestTask.new do |task|
  task.libs << "test"

  task.test_files = Dir['test/**/*_test.rb'].reject {|path| /(experimental)/ =~ path }
  task.verbose    = true
  task.warning    = true
end

Rake::TestTask.new("test:experimental") do |task|
  task.libs << "test"
  task.pattern = 'test/experimental/**/*_test.rb'
  task.verbose = true
  task.warning = true
  task.ruby_opts << "-rdid_you_mean/experimental"
end

task default: %i(test test:experimental)

namespace :test do
  namespace :accuracy do
    desc "Download Wiktionary's Simple English data and save it as a dictionary"
    task :prepare do
      sh 'ruby evaluation/dictionary_generator.rb'
    end
  end

  desc "Calculate accuracy of the gems' spell checker"
  task :accuracy do
    if !File.exist?("evaluation/dictionary.yml")
      puts 'Generating dictionary for evaluation:'
      Rake::Task["test:accuracy:prepare"].execute
      puts "\n"
    end

    sh 'ruby evaluation/calculator.rb'
  end
end

namespace :benchmark do
  desc "Measure memory usage by the did_you_mean gem"
  task :memory do
    sh 'ruby benchmark/memory_usage.rb'
  end
end
