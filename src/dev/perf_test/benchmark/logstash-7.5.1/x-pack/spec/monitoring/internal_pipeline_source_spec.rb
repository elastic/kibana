# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License;
# you may not use this file except in compliance with the Elastic License.

require "logstash-core"
require "logstash/agent"
require "logstash/agent"
require "monitoring/inputs/metrics"
require "logstash/config/pipeline_config"
require "logstash/config/source/local"
require 'license_checker/x_pack_info'
require "rspec/wait"
require 'spec_helper'
require "json"
require "json-schema"
require 'license_checker/x_pack_info'
require 'monitoring/monitoring'


describe LogStash::Monitoring::InternalPipelineSource do
  context 'license testing' do
    let(:xpack_monitoring_interval) { 1 }
    let(:options) { { "collection_interval" => xpack_monitoring_interval,
                        "collection_timeout_interval" => 600 } }

    subject { described_class.new(pipeline_config, mock_agent) }
    let(:mock_agent) { double("agent")}
    let(:mock_license_client) { double("es_client")}
    let(:license_reader) { LogStash::LicenseChecker::LicenseReader.new(system_settings, 'monitoring', es_options)}
    let(:system_settings) { LogStash::Runner::SYSTEM_SETTINGS.clone }
    let(:license_status) { 'active'}
    let(:license_type) { 'trial' }
    let(:license_expiry_date) { Time.now + (60 * 60 * 24)}
    let(:source) { LogStash::Config::Source::Local }
    let(:pipeline_id) { :main }
    let(:ordered_config_parts) do
      [
        org.logstash.common.SourceWithMetadata.new("file", "/tmp/1", 0, 0, "input { generator1 }"),
        org.logstash.common.SourceWithMetadata.new("file", "/tmp/2", 0, 0,  "input { generator2 }"),
        org.logstash.common.SourceWithMetadata.new("file", "/tmp/3", 0, 0, "input { generator3 }"),
        org.logstash.common.SourceWithMetadata.new("file", "/tmp/4", 0, 0, "input { generator4 }"),
        org.logstash.common.SourceWithMetadata.new("file", "/tmp/5", 0, 0, "input { generator5 }"),
        org.logstash.common.SourceWithMetadata.new("file", "/tmp/6", 0, 0, "input { generator6 }"),
        org.logstash.common.SourceWithMetadata.new("string", "config_string", 0, 0, "input { generator1 }"),
      ]
    end

    let(:unordered_config_parts) { ordered_config_parts.shuffle }

    let(:pipeline_config) { LogStash::Config::PipelineConfig.new(source, pipeline_id, unordered_config_parts, system_settings) }

    let(:es_options) do
      {
          'hosts' => elasticsearch_url,
          'user' => elasticsearch_username,
          'password' => elasticsearch_password
      }
    end
    let(:elasticsearch_url) { ["https://localhost:9898"] }
    let(:elasticsearch_username) { "elastictest" }
    let(:elasticsearch_password) { "testchangeme" }

    let(:settings) do
      {
        "xpack.monitoring.enabled" => true,
        "xpack.monitoring.elasticsearch.hosts" => elasticsearch_url,
        "xpack.monitoring.elasticsearch.username" => elasticsearch_username,
        "xpack.monitoring.elasticsearch.password" => elasticsearch_password,
      }
    end

    before :each do
      allow(subject).to receive(:es_options_from_settings_or_modules).and_return(es_options)
      allow(subject).to receive(:license_reader).and_return(license_reader)
      allow(license_reader).to receive(:build_client).and_return(mock_license_client)
    end

    describe 'with licensing' do
      context 'when xpack has not been installed on es 6' do
        let(:xpack_info) { LogStash::LicenseChecker::XPackInfo.xpack_not_installed }
        it "does not start the pipeline" do
          expect(subject).to_not receive(:enable_monitoring)
          subject.update_license_state(xpack_info)
        end
      end
      context 'when the license has expired' do
        let(:license) do
          { "status" => "inactive", "type" => license_type }
        end
        let(:xpack_info) { LogStash::LicenseChecker::XPackInfo.new(license, nil) }
        it "still starts the pipeline" do
          expect(subject).to receive(:enable_monitoring)
          subject.update_license_state(xpack_info)
        end
      end
      context 'when the license server is not available' do
        let(:xpack_info) { LogStash::LicenseChecker::XPackInfo.new(nil, nil, nil, true) }
        it "does not start the pipeline" do
          expect(subject).to_not receive(:enable_monitoring)
          subject.update_license_state(xpack_info)
        end
      end

      %w(basic standard trial gold platinum).each  do |license_type|
        context "With a valid #{license_type} license" do
          let(:license_type) { license_type }
          let(:license) do
            { "status" => "active", "type" => license_type }
          end
          let(:features) do
            { "monitoring" => { "enabled" => true } }
          end
          let(:xpack_info) { LogStash::LicenseChecker::XPackInfo.new(license, features) }
          it "starts the pipeline" do
            expect(subject).to receive(:enable_monitoring)
            subject.update_license_state(xpack_info)
          end
        end
      end
    end
  end
end
