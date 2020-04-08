# -*- encoding: utf-8 -*-
lib = File.expand_path('../lib', __FILE__)
$LOAD_PATH.unshift(lib) unless $LOAD_PATH.include?(lib)

project_versions_yaml_path = File.expand_path("../versions.yml", File.dirname(__FILE__))
if File.exist?(project_versions_yaml_path)
  # we need to copy the project level versions.yml into the gem root
  # to be able to package it into the gems file structure
  # as the require 'logstash-core-plugin-api/version' loads the yaml file from within the gem root.
  #
  # we ignore the copy in git and we overwrite an existing file
  # each time we build the logstash-core gem
  original_lines = IO.readlines(project_versions_yaml_path)
  original_lines << ""
  original_lines << "# This is a copy the project level versions.yml into this gem's root and it is created when the gemspec is evaluated."
  gem_versions_yaml_path = File.expand_path("./versions-gem-copy.yml", File.dirname(__FILE__))
  File.open(gem_versions_yaml_path, 'w') do |new_file|
    # create or overwrite
    new_file.puts(original_lines)
  end
end

require "logstash-core-plugin-api/version"

Gem::Specification.new do |gem|
  gem.authors       = ["Elastic"]
  gem.email         = ["info@elastic.co"]
  gem.description   = %q{Logstash plugin API}
  gem.summary       = %q{Define the plugin API that the plugin need to follow.}
  gem.homepage      = "http://www.elastic.co/guide/en/logstash/current/index.html"
  gem.license       = "Apache-2.0"

  gem.files         = Dir.glob(["logstash-core-plugin-api.gemspec", "lib/**/*.rb", "spec/**/*.rb"])
  gem.test_files    = gem.files.grep(%r{^(test|spec|features)/})
  gem.name          = "logstash-core-plugin-api"
  gem.require_paths = ["lib"]
  gem.version       = LOGSTASH_CORE_PLUGIN_API

  gem.add_runtime_dependency "logstash-core", LOGSTASH_CORE_VERSION.gsub("-", ".")

  # Make sure we dont build this gem from a non jruby
  # environment.
  if RUBY_PLATFORM == "java"
    gem.platform = "java"
  else
    raise "The logstash-core-api need to be build on jruby"
  end
end
