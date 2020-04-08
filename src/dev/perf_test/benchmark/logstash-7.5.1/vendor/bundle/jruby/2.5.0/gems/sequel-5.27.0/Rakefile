require "rake"
require "rake/clean"

NAME = 'sequel'
VERS = lambda do
  require File.expand_path("../lib/sequel/version", __FILE__)
  Sequel.version
end
CLEAN.include ["sequel-*.gem", "rdoc", "coverage", "www/public/*.html", "www/public/rdoc*", "spec/bin-sequel-*"]

# Gem Packaging

desc "Build sequel gem"
task :package=>[:clean] do |p|
  sh %{#{FileUtils::RUBY} -S gem build sequel.gemspec}
end

### Website

desc "Make local version of website"
task :website do
  sh %{#{FileUtils::RUBY} www/make_www.rb}
end

### RDoc

RDOC_DEFAULT_OPTS = ["--line-numbers", '--title', 'Sequel: The Database Toolkit for Ruby']

begin
  # Sequel uses hanna-nouveau for the website RDoc.
  gem 'hanna-nouveau'
  RDOC_DEFAULT_OPTS.concat(['-f', 'hanna'])
rescue Gem::LoadError
end

require "rdoc/task"

RDOC_OPTS = RDOC_DEFAULT_OPTS + ['--main', 'README.rdoc']

RDoc::Task.new do |rdoc|
  rdoc.rdoc_dir = "rdoc"
  rdoc.options += RDOC_OPTS
  rdoc.rdoc_files.add %w"README.rdoc CHANGELOG MIT-LICENSE lib/**/*.rb doc/*.rdoc doc/release_notes/*.txt"
end

desc "Make rdoc for website"
task :website_rdoc=>[:website_rdoc_main, :website_rdoc_adapters, :website_rdoc_plugins]

RDoc::Task.new(:website_rdoc_main) do |rdoc|
  rdoc.rdoc_dir = "www/public/rdoc"
  rdoc.options += RDOC_OPTS + %w'--no-ignore-invalid'
  rdoc.rdoc_files.add %w"README.rdoc CHANGELOG doc/CHANGELOG.old MIT-LICENSE lib/*.rb lib/sequel/*.rb lib/sequel/{connection_pool,dataset,database,model}/*.rb doc/*.rdoc doc/release_notes/*.txt lib/sequel/extensions/migration.rb"
end

RDoc::Task.new(:website_rdoc_adapters) do |rdoc|
  rdoc.rdoc_dir = "www/public/rdoc-adapters"
  rdoc.options += RDOC_DEFAULT_OPTS + %w'--main Sequel --no-ignore-invalid'
  rdoc.rdoc_files.add %w"lib/sequel/adapters/**/*.rb"
end

RDoc::Task.new(:website_rdoc_plugins) do |rdoc|
  rdoc.rdoc_dir = "www/public/rdoc-plugins"
  rdoc.options += RDOC_DEFAULT_OPTS + %w'--main Sequel --no-ignore-invalid'
  rdoc.rdoc_files.add %w"lib/sequel/{extensions,plugins}/**/*.rb doc/core_*"
end

### Specs

run_spec = proc do |file|
  lib_dir = File.join(File.dirname(File.expand_path(__FILE__)), 'lib')
  rubylib = ENV['RUBYLIB']
  ENV['RUBYLIB'] ? (ENV['RUBYLIB'] += ":#{lib_dir}") : (ENV['RUBYLIB'] = lib_dir)
  sh "#{FileUtils::RUBY} #{file}"
  ENV['RUBYLIB'] = rubylib
end

spec_task = proc do |description, name, file, coverage|
  desc description
  task name do
    run_spec.call(file)
  end

  desc "#{description} with warnings, some warnings filtered"
  task :"#{name}_w" do
    rubyopt = ENV['RUBYOPT']
    ENV['RUBYOPT'] = "#{rubyopt} -w"
    ENV['WARNING'] = '1'
    run_spec.call(file)
    ENV.delete('WARNING')
    ENV['RUBYOPT'] = rubyopt
  end

  if coverage
    desc "#{description} with coverage"
    task :"#{name}_cov" do
      ENV['COVERAGE'] = '1'
      run_spec.call(file)
      ENV.delete('COVERAGE')
    end
  end
end

desc "Run the core, model, and extension/plugin specs"
task :default => :spec
desc "Run the core, model, and extension/plugin specs"
task :spec => [:spec_core, :spec_model, :spec_plugin]

spec_task.call("Run core and model specs together", :spec_core_model, 'spec/core_model_spec.rb', true)
spec_task.call("Run core specs", :spec_core, 'spec/core_spec.rb', false)
spec_task.call("Run model specs", :spec_model, 'spec/model_spec.rb', false)
spec_task.call("Run plugin/extension specs", :spec_plugin, 'spec/plugin_spec.rb', true)
spec_task.call("Run bin/sequel specs", :spec_bin, 'spec/bin_spec.rb', false)
spec_task.call("Run core extensions specs", :spec_core_ext, 'spec/core_extensions_spec.rb', true)
spec_task.call("Run integration tests", :spec_integration, 'spec/adapter_spec.rb none', true)

%w'postgres sqlite mysql oracle mssql db2 sqlanywhere'.each do |adapter|
  spec_task.call("Run #{adapter} tests", :"spec_#{adapter}", "spec/adapter_spec.rb #{adapter}", true)
end

spec_task.call("Run model specs without the associations code", :_spec_model_no_assoc, 'spec/model_no_assoc_spec.rb', false)
desc "Run model specs without the associations code"
task :spec_model_no_assoc do
  ENV['SEQUEL_NO_ASSOCIATIONS'] = '1'
  Rake::Task['_spec_model_no_assoc'].invoke
end

task :spec_travis=>[:spec_core, :spec_model, :spec_plugin, :spec_core_ext] do
  if defined?(RUBY_ENGINE) && RUBY_ENGINE == 'jruby'
    ENV['SEQUEL_SQLITE_URL'] = "jdbc:sqlite::memory:"
    ENV['SEQUEL_POSTGRES_URL'] = "jdbc:postgresql://localhost/sequel_test?user=postgres"
    ENV['SEQUEL_MYSQL_URL'] = "jdbc:mysql://localhost/sequel_test?user=root"
  else
    ENV['SEQUEL_SQLITE_URL'] = "sqlite:/"
    ENV['SEQUEL_POSTGRES_URL'] = "postgres://localhost/sequel_test?user=postgres"
    ENV['SEQUEL_MYSQL_URL'] = "mysql2://localhost/sequel_test?user=root"
  end

  Rake::Task['spec_sqlite'].invoke
  Rake::Task['spec_postgres'].invoke
  Rake::Task['spec_mysql'].invoke
end

desc "Print Sequel version"
task :version do
  puts VERS.call
end

desc "Check syntax of all .rb files"
task :check_syntax do
  Dir['**/*.rb'].each{|file| print `#{FileUtils::RUBY} -c #{file} | fgrep -v "Syntax OK"`}
end
