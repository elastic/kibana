# encoding: utf-8
require "erb"

require_relative "elasticsearch_config"
require_relative "kibana_config"
require_relative "logstash_config"

module LogStash module Modules class Scaffold
  include LogStash::Util::Loggable

  attr_reader :directory, :module_name, :kibana_version_parts
  attr_reader :kibana_configuration, :logstash_configuration, :elasticsearch_configuration

  def initialize(name, directory)
    @module_name = name
    @directory = directory  # this is the 'configuration folder in the GEM root.'
    @kibana_version_parts = "6.0.0".split('.') # this is backup in case kibana client fails to connect
    logger.debug("Found module", :module_name => name, :directory => directory)
  end

  def add_kibana_version(version_parts)
    @kibana_version_parts = version_parts
  end

  def import(import_engine, kibana_import_engine)
    @elasticsearch_configuration.resources.each do |resource|
      import_engine.put(resource)
    end
    @kibana_configuration.resources.each do |resource|
      kibana_import_engine.put(resource)
    end
  end

  def with_settings(module_settings)
    @logstash_configuration = LogStashConfig.new(self, module_settings)
    @kibana_configuration = KibanaConfig.new(self, module_settings)
    @elasticsearch_configuration = ElasticsearchConfig.new(self, module_settings)
    self
  end

  def config_string()
    # settings should be set earlier by the caller.
    # settings should be the subset from the YAML file with a structure like
    # {"name" => "plugin name", "k1" => "v1", "k2" => "v2"}, etc.
    return nil if @logstash_configuration.nil?
    @logstash_configuration.config_string
  end

  # subclass may override
  def is_enabled?(settings)
    true
  end

end end end # class LogStash::Modules::Scaffold

