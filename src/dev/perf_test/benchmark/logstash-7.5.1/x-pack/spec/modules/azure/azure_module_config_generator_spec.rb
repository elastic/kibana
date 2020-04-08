# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License;
# you may not use this file except in compliance with the Elastic License.

require 'x-pack/logstash_registry'
require 'logstash-core'
require 'logstash/settings'
require 'logstash/util/modules_setting_array'
require 'logstash/modules/scaffold'
require 'azure_module_config_generator'

describe LogStash::Azure::ConfigGenerator do

  # always clone and work with the clone since settings are global and can bleed between tests
  let(:settings) {settings = LogStash::SETTINGS.clone}

  describe "valid configuration" do
    it "advanced" do
      settings.from_yaml(::File.join(File.dirname(__FILE__), "samples", "yaml"), "logstash.advanced.yml")
      module_hash = settings.get("modules").find {|m| m["name"] == 'azure'}
      scaffolding = LogStash::Modules::Scaffold.new('azure', ::File.join(File.dirname(__FILE__), '..', '..', '..', 'modules', 'azure', 'configuration'))
      module_config = LogStash::Modules::LogStashConfig.new(scaffolding, module_hash)

      expected = <<-EXPECTED
threads => 8
decorate_events => true
consumer_group => "logstash"
config_mode => "advanced"
event_hubs => [
  {"insights-operational-logs" => {
    event_hub_connection => "Endpoint=sb://example1..."
    storage_connection => "DefaultEndpointsProtocol=https;AccountName=example1...."
    initial_position => "HEAD"
    decorate_events => "true"
  }},
  {"insights-metrics-pt1m" => {
    event_hub_connection => "Endpoint=sb://example2..."
    storage_connection => "DefaultEndpointsProtocol=https;AccountName=example2...."
    initial_position => "TAIL"
    decorate_events => "true"
  }},
  {"insights-logs-errors" => {
    event_hub_connection => "Endpoint=sb://example3..."
    storage_connection => "DefaultEndpointsProtocol=https;AccountName=example3...."
    initial_position => "LOOK_BACK"
    decorate_events => "false"
  }},
  {"insights-operational-logs" => {
    event_hub_connection => "Endpoint=sb://example4..."
    storage_connection => "DefaultEndpointsProtocol=https;AccountName=example4...."
    initial_position => "HEAD"
    decorate_events => "true"
  }}
]
      EXPECTED

      expected_config_lines = expected.lines
      actual_config_lines = module_config.config_string.lines
      expect(expected_config_lines.size).to be < actual_config_lines.size
      compare = false
      i = 0
      actual_config_lines.each do |line|
        if line.include?('end azure_event_hubs')
          compare = false
        end
        if compare
          expect(line.strip).to eql(expected_config_lines[i].strip)
          i += 1
        end
        if line.include?('start azure_event_hubs')
          compare = true
        end
      end
    end

    it "basic" do
      settings.from_yaml(::File.join(File.dirname(__FILE__), "samples", "yaml"), "logstash.basic.yml")
      # puts settings.to_hash.to_s
      module_hash = settings.get("modules").find {|m| m["name"] == 'azure'}
      scaffolding = LogStash::Modules::Scaffold.new('azure', ::File.join(File.dirname(__FILE__), '..', '..', '..', 'modules', 'azure', 'configuration'))
      module_config = LogStash::Modules::LogStashConfig.new(scaffolding, module_hash)
      module_config.config_string
      expected = <<-EXPECTED
threads => 8
decorate_events => true
consumer_group => "logstash"
storage_connection => "DefaultEndpointsProtocol=https;AccountName=example...."
event_hub_connections => ["Endpoint=sb://example1...EntityPath=insights-logs-errors", "Endpoint=sb://example2...EntityPath=insights-metrics-pt1m"]
      EXPECTED

      expected_config_lines = expected.lines
      actual_config_lines = module_config.config_string.lines
      expect(expected_config_lines.size).to be < actual_config_lines.size
      compare = false
      i = 0
      actual_config_lines.each do |line|
        if line.include?('end azure_event_hubs')
          compare = false
        end
        if compare
          expect(line.strip).to eql(expected_config_lines[i].strip)
          i += 1
        end
        if line.include?('start azure_event_hubs')
          compare = true
        end
      end
    end
  end

  describe "invalid configuration" do
    it "advanced1" do
      settings.from_yaml(::File.join(File.dirname(__FILE__), "samples", "yaml"), "logstash.advanced_invalid1.yml")
      module_hash = settings.get("modules").find {|m| m["name"] == 'azure'}
      scaffolding = LogStash::Modules::Scaffold.new('azure', ::File.join(File.dirname(__FILE__), '..', '..', '..', 'modules', 'azure', 'configuration'))
      module_config = LogStash::Modules::LogStashConfig.new(scaffolding, module_hash)
      expect {module_config.config_string}.to raise_error(/must be a set of arrays/)
    end

    it "advanced2" do
      settings.from_yaml(::File.join(File.dirname(__FILE__), "samples", "yaml"), "logstash.advanced_invalid2.yml")
      module_hash = settings.get("modules").find {|m| m["name"] == 'azure'}
      scaffolding = LogStash::Modules::Scaffold.new('azure', ::File.join(File.dirname(__FILE__), '..', '..', '..', 'modules', 'azure', 'configuration'))
      module_config = LogStash::Modules::LogStashConfig.new(scaffolding, module_hash)
      expect {module_config.config_string}.to raise_error(/'var.input.azure_event_hubs.event_hub_connections' must be set/)
    end

    it "basic1" do
      settings.from_yaml(::File.join(File.dirname(__FILE__), "samples", "yaml"), "logstash.basic_invalid1.yml")
      module_hash = settings.get("modules").find {|m| m["name"] == 'azure'}
      scaffolding = LogStash::Modules::Scaffold.new('azure', ::File.join(File.dirname(__FILE__), '..', '..', '..', 'modules', 'azure', 'configuration'))
      module_config = LogStash::Modules::LogStashConfig.new(scaffolding, module_hash)
      expect {module_config.config_string}.to raise_error(/'var.input.azure_event_hubs.event_hub_connections' must be set./)
    end

    it "basic2" do
      settings.from_yaml(::File.join(File.dirname(__FILE__), "samples", "yaml"), "logstash.basic_invalid2.yml")
      module_hash = settings.get("modules").find {|m| m["name"] == 'azure'}
      scaffolding = LogStash::Modules::Scaffold.new('azure', ::File.join(File.dirname(__FILE__), '..', '..', '..', 'modules', 'azure', 'configuration'))
      module_config = LogStash::Modules::LogStashConfig.new(scaffolding, module_hash)
      expect {module_config.config_string}.to raise_error(/'var.input.azure_event_hubs.event_hub_connections' must be set./)
    end

  end

end