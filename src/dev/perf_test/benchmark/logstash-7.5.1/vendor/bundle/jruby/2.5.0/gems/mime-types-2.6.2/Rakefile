# -*- ruby encoding: utf-8 -*-

require 'rubygems'
require 'hoe'
require 'rake/clean'

Hoe.plugin :doofus
Hoe.plugin :gemspec2
Hoe.plugin :git
Hoe.plugin :minitest
Hoe.plugin :travis
Hoe.plugin :email unless ENV['CI'] or ENV['TRAVIS']

spec = Hoe.spec 'mime-types' do
  developer('Austin Ziegler', 'halostatue@gmail.com')
  self.need_tar = true

  require_ruby_version '>= 1.9.2'

  self.history_file = 'History.rdoc'
  self.readme_file = 'README.rdoc'
  self.extra_rdoc_files = FileList['*.rdoc'].to_a

  self.licenses = ['MIT', 'Artistic 2.0', 'GPL-2']

  extra_dev_deps << ['hoe-doofus', '~> 1.0']
  extra_dev_deps << ['hoe-gemspec2', '~> 1.1']
  extra_dev_deps << ['hoe-git', '~> 1.6']
  extra_dev_deps << ['hoe-rubygems', '~> 1.0']
  extra_dev_deps << ['hoe-travis', '~> 1.2']
  extra_dev_deps << ['minitest', '~> 5.4']
  extra_dev_deps << ['minitest-autotest', '~> 1.0']
  extra_dev_deps << ['minitest-focus', '~> 1.0']
  extra_dev_deps << ['rake', '~> 10.0']
  extra_dev_deps << ['simplecov', '~> 0.7']
  extra_dev_deps << ['coveralls', '~> 0.8']
end

task :support do
  %w(lib support).each { |path|
    $LOAD_PATH.unshift(File.join(Rake.application.original_dir, path))
  }
end

task 'support:nokogiri' => :support do
  begin
    gem 'nokogiri'
  rescue Gem::LoadError
    raise 'Nokogiri is not installed. Please install it.'
  end
end

namespace :benchmark do
  desc 'Benchmark Load Times'
  task :load, [ :repeats ] => :support do |_, args|
    require 'benchmarks/load'
    Benchmarks::Load.report(
      File.join(Rake.application.original_dir, 'lib'),
      args.repeats
    )
  end

  desc 'Allocation counts'
  task :allocations, [ :top_x, :mime_types_only ] => :support do |_, args|
    require 'benchmarks/load_allocations'
    Benchmarks::LoadAllocations.report(
      top_x: args.top_x,
      mime_types_only: args.mime_types_only
    )
  end

  desc 'Columnar allocation counts'
  task 'allocations:columnar', [ :top_x, :mime_types_only ] => :support do |_, args|
    require 'benchmarks/load_allocations'
    Benchmarks::LoadAllocations.report(
      columnar: true,
      top_x: args.top_x,
      mime_types_only: args.mime_types_only
    )
  end

  desc 'Object counts'
  task objects: :support do
    require 'benchmarks/object_counts'
    Benchmarks::ObjectCounts.report
  end

  desc 'Columnar object counts'
  task 'objects:columnar' => :support do
    require 'benchmarks/object_counts'
    Benchmarks::ObjectCounts.report(columnar: true)
  end
end

namespace :test do
  task :coveralls do
    spec.test_prelude = [
      'require "psych"',
      'require "simplecov"',
      'require "coveralls"',
      'SimpleCov.formatter = Coveralls::SimpleCov::Formatter',
      'SimpleCov.start("test_frameworks") { command_name "Minitest" }',
      'gem "minitest"'
    ].join('; ')
    Rake::Task['test'].execute
  end

  desc 'Run test coverage'
  task :coverage do
    spec.test_prelude = [
      'require "simplecov"',
      'SimpleCov.start("test_frameworks") { command_name "Minitest" }',
      'gem "minitest"'
    ].join('; ')
    Rake::Task['test'].execute
  end
end

namespace :mime do
  desc 'Download the current MIME type registrations from IANA.'
  task :iana, [ :destination ] => 'support:nokogiri' do |_, args|
    require 'iana_registry'
    IANARegistry.download(to: args.destination)
  end

  desc 'Download the current MIME type configuration from Apache.'
  task :apache, [ :destination ] => 'support:nokogiri' do |_, args|
    require 'apache_mime_types'
    ApacheMIMETypes.download(to: args.destination)
  end
end

namespace :convert do
  namespace :docs do
    task :setup do
      gem 'rdoc'
      require 'rdoc/rdoc'
      @doc_converter ||= RDoc::Markup::ToMarkdown.new
    end

    %w(README History History-Types).each do |name|
      rdoc = "#{name}.rdoc"
      mark = "#{name}.md"

      file mark => [ rdoc, :setup ] do |t|
        puts "#{rdoc} => #{mark}"
        File.open(t.name, 'wb') { |target|
          target.write @doc_converter.convert(IO.read(t.prerequisites.first))
        }
      end

      CLEAN.add mark

      task run: [ mark ]
    end
  end

  desc 'Convert documentation from RDoc to Markdown'
  task docs: 'convert:docs:run'

  namespace :yaml do
    desc 'Convert from YAML to JSON'
    task :json, [ :source, :destination, :multiple_files ] => :support do |_, args|
      require 'convert'
      Convert.from_yaml_to_json(args)
    end

    desc 'Convert from YAML to Columnar'
    task :columnar, [ :source, :destination ] => :support do |_, args|
      require 'convert/columnar'
      Convert::Columnar.from_yaml_to_columnar(args)
    end
  end

  namespace :json do
    desc 'Convert from JSON to YAML'
    task :yaml, [ :source, :destination, :multiple_files ] => :support do |_, args|
      require 'convert'
      Convert.from_json_to_yaml(args)
    end
  end
end

Rake::Task['travis'].prerequisites.replace(%w(test:coveralls))
Rake::Task['gem'].prerequisites.unshift('convert:yaml:json')

# vim: syntax=ruby
