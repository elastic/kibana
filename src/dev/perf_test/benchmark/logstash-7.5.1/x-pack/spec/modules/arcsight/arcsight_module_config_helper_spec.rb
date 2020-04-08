# encoding: utf-8

# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License;
# you may not use this file except in compliance with the Elastic License.

# require "logstash/devutils/rspec/spec_helper"

require 'x-pack/logstash_registry'
require 'logstash-core'
require 'logstash/settings'
require 'logstash/util/modules_setting_array'
require 'logstash/modules/scaffold'
require 'arcsight_module_config_helper'

describe LogStash::Arcsight::ConfigHelper do

  let(:sample_yaml_folder) { ::File.join(File.dirname(__FILE__), "yaml") }
  let(:settings) { settings = LogStash::SETTINGS.clone }
  let(:module_name) { "arcsight" }
  let(:module_hash) { Hash.new }
  let(:scaffolding) { LogStash::Modules::Scaffold.new(module_name, ::File.join(File.dirname(__FILE__), '..', '..', '..', 'modules', 'arcsight', 'configuration')) }
  let(:module_config) { LogStash::Modules::LogStashConfig.new(scaffolding, module_hash) }

  describe "`tcp_input_ssl_config` method" do
    context "when ssl_enabled is not enabled" do
      it "returns an empty string" do
        expect(described_class.tcp_input_ssl_config(module_config)).to be_empty
      end
    end

    context "when ssl_enabled is enabled" do
      before do
        settings.from_yaml(sample_yaml_folder, "smart_connector_with_ssl.yml")
      end
      let(:module_hash) { settings.get("modules").find {|m| m["name"] == module_name} }

      it "returns a tcp input ssl settings snippet" do
        actual = described_class.tcp_input_ssl_config(module_config)
        expect(actual).not_to be_empty
        expect(actual).to include("ssl_enable => true")
        expect(actual).to include("ssl_verify => false")
        expect(actual).to include("ssl_cert => '/some/path/to/a/cert.p12'")
        expect(actual).to include("ssl_key => '/some/path/to/a/cert.p12'")
        expect(actual).to include("ssl_key_passphrase => 'foobar'")
        expect(actual).to include("ssl_extra_chain_certs => ['/some/path/to/a/cert.p12']")
      end
    end
  end

  describe "`kafka_input_ssl_sasl_config` method" do
    context "when security_protocol is not set" do
      it "returns an empty string" do
        expect(described_class.kafka_input_ssl_sasl_config(module_config)).to be_empty
      end
    end

    context "when security_protocol is set" do
      before do
        settings.from_yaml(sample_yaml_folder, "event_broker_with_security.yml")
      end
      let(:module_hash) { settings.get("modules").find {|m| m["name"] == module_name} }
      it "returns a kafka input security settings snippet" do
        actual = described_class.kafka_input_ssl_sasl_config(module_config)
        expect(actual).not_to be_empty
        expect(actual).to include("security_protocol => 'SASL_SSL'")
        expect(actual).to include("ssl_truststore_type => 'foo'")
        expect(actual).to include("ssl_truststore_location => '/some/path/to/a/file'")
        expect(actual).to include("ssl_truststore_password => '<password>'")
        expect(actual).to include("ssl_keystore_password => '<password>'")
        expect(actual).to include("ssl_key_password => '<password>'")
        expect(actual).to include("ssl_keystore_type => 'bar'")
        expect(actual).to include("ssl_keystore_location => '/some/path/to/a/file'")
        expect(actual).to include("sasl_mechanism => 'GSSAPI'")
        expect(actual).to include("sasl_kerberos_service_name => 'baz'")
        expect(actual).to include("jaas_path => '/some/path/to/a/file'")
        expect(actual).to include("kerberos_config => '/some/path/to/a/file'")
      end
    end
  end
end
