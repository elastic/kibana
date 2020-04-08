# encoding: utf-8

# The version of the logstash package (not the logstash-core gem version).
#
# sourced from a copy of the master versions.yml file, see logstash-core/logstash-core.gemspec
if !defined?(ALL_VERSIONS)
  require 'yaml'
  ALL_VERSIONS = YAML.load_file(File.expand_path("../../versions-gem-copy.yml", File.dirname(__FILE__)))
end
if !defined?(LOGSTASH_VERSION)
  LOGSTASH_VERSION = ALL_VERSIONS.fetch("logstash")
end
