# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License;
# you may not use this file except in compliance with the Elastic License.

require "spec_helper"
require "logstash/json"
require 'helpers/elasticsearch_options'
require "license_checker/license_manager"
require 'monitoring/monitoring'

shared_examples "elasticsearch options hash is populated without security" do
  it "with username, hosts and password" do
      expect(test_class.es_options_from_settings_or_modules('monitoring', system_settings)).to include(
                                                                                                   "hosts" => expected_url,
                                                                                                   "user" => expected_username,
                                                                                                   "password" => expected_password
                                                                                               )

  end
end

shared_examples 'elasticsearch options hash is populated with secure options' do
  context "with ca" do
    let(:elasticsearch_ca) { Stud::Temporary.file.path }
    let(:settings) { super.merge({ "xpack.monitoring.elasticsearch.ssl.certificate_authority" => elasticsearch_ca })}

    it "creates the elasticsearch output options hash" do
      expect(test_class.es_options_from_settings('monitoring', system_settings)).to include(
                                                                                        "hosts" => elasticsearch_url,
                                                                                        "user" => elasticsearch_username,
                                                                                        "password" => elasticsearch_password,
                                                                                        "ssl" => true,
                                                                                        "cacert" => elasticsearch_ca
                                                                                    )
    end
  end

  context "with truststore" do
    let(:elasticsearch_truststore_path) { Stud::Temporary.file.path }
    let(:elasticsearch_truststore_password) { "truststore_password" }
    let(:settings) do
      super.merge({
                      "xpack.monitoring.elasticsearch.ssl.truststore.path" => elasticsearch_truststore_path,
                      "xpack.monitoring.elasticsearch.ssl.truststore.password" => elasticsearch_truststore_password,
                  })
    end

    it "creates the elasticsearch output options hash" do
      expect(test_class.es_options_from_settings('monitoring', system_settings)).to include(
                                                                                        "hosts" => elasticsearch_url,
                                                                                        "user" => elasticsearch_username,
                                                                                        "password" => elasticsearch_password,
                                                                                        "ssl" => true,
                                                                                        "truststore" => elasticsearch_truststore_path,
                                                                                        "truststore_password" => elasticsearch_truststore_password
                                                                                    )
    end
  end

  context "with keystore" do
    let(:elasticsearch_keystore_path) { Stud::Temporary.file.path }
    let(:elasticsearch_keystore_password) { "keystore_password" }

    let(:settings) do
      super.merge({
                      "xpack.monitoring.elasticsearch.ssl.keystore.path" => elasticsearch_keystore_path,
                      "xpack.monitoring.elasticsearch.ssl.keystore.password" => elasticsearch_keystore_password,
                  })
    end

    it "creates the elasticsearch output options hash" do
      expect(test_class.es_options_from_settings('monitoring', system_settings)).to include(
                                                                                        "hosts" => elasticsearch_url,
                                                                                        "user" => elasticsearch_username,
                                                                                        "password" => elasticsearch_password,
                                                                                        "ssl" => true,
                                                                                        "keystore" => elasticsearch_keystore_path,
                                                                                        "keystore_password" => elasticsearch_keystore_password
                                                                                    )
    end
  end
end

describe LogStash::Helpers::ElasticsearchOptions do
  let(:test_class) { Class.new { extend LogStash::Helpers::ElasticsearchOptions } }
  let(:elasticsearch_url) { ["https://localhost:9898"] }
  let(:elasticsearch_username) { "elastictest" }
  let(:elasticsearch_password) { "testchangeme" }
  let(:expected_url) { elasticsearch_url }
  let(:expected_username) { elasticsearch_username }
  let(:expected_password) { elasticsearch_password }
  let(:extension) {  LogStash::MonitoringExtension.new }
  let(:system_settings) { LogStash::Runner::SYSTEM_SETTINGS.clone }

  before :each do
    extension.additionals_settings(system_settings)
    apply_settings(settings, system_settings)
  end

  describe "es_options_from_settings" do
    let(:settings) do
      {
          "xpack.monitoring.enabled" => true,
          "xpack.monitoring.elasticsearch.hosts" => elasticsearch_url,
          "xpack.monitoring.elasticsearch.username" => elasticsearch_username,
          "xpack.monitoring.elasticsearch.password" => elasticsearch_password,
      }
    end

    it_behaves_like 'elasticsearch options hash is populated without security'
    it_behaves_like 'elasticsearch options hash is populated with secure options'
  end

  describe 'es_options_from_settings_or_modules' do
    context 'when only settings are set' do
      let(:settings) do
        {
            "xpack.monitoring.enabled" => true,
            "xpack.monitoring.elasticsearch.hosts" => elasticsearch_url,
            "xpack.monitoring.elasticsearch.username" => elasticsearch_username,
            "xpack.monitoring.elasticsearch.password" => elasticsearch_password,
        }
      end

      it_behaves_like 'elasticsearch options hash is populated without security'
      it_behaves_like 'elasticsearch options hash is populated with secure options'
    end

    context 'with modules set' do
      let(:modules_es_url) { ["https://localhost:9898", "https://localhost:9999"]}
      let(:modules_es_username) { "modules_user"}
      let(:modules_es_password) { "correcthorsebatterystaple"}

      context 'when only modules cli are set' do
        let(:expected_url) { modules_es_url }
        let(:expected_username) { modules_es_username }
        let(:expected_password) { modules_es_password }
        let(:settings) { {"modules.cli" => [{ "name" => "hello",
                                                          'var.elasticsearch.hosts' => modules_es_url,
                                                          'var.elasticsearch.username' => modules_es_username,
                                                          'var.elasticsearch.password' => modules_es_password}]}
        }

        it_behaves_like 'elasticsearch options hash is populated without security'
      end

      context 'when only modules yaml are set' do
        let(:expected_url) { modules_es_url }
        let(:expected_username) { modules_es_username }
        let(:expected_password) { modules_es_password }
        let(:settings) { {"modules" => [{ "name" => "hello",
                                              'var.elasticsearch.hosts' => modules_es_url,
                                              'var.elasticsearch.username' => modules_es_username,
                                              'var.elasticsearch.password' => modules_es_password}]}
        }

        it_behaves_like 'elasticsearch options hash is populated without security'
      end

      context 'when cloud id and auth are set' do
        let(:cloud_name) { 'thebigone'}
        let(:cloud_domain) { 'elastic.co'}
        let(:base64_encoded) { Base64.urlsafe_encode64("#{cloud_domain}$#{cloud_name}$ignored")}
        let(:cloud_id) { "label:#{base64_encoded}" }
        let(:cloud_username) { 'cloudy' }
        let(:cloud_password) { 'cloud_password'}
        let(:expected_url) { ["https://#{cloud_name}.#{cloud_domain}:443"] }
        let(:expected_username) { cloud_username }
        let(:expected_password) { cloud_password }
        let(:settings) {
          {
              "cloud.id" => cloud_id,
              "cloud.auth" => "#{cloud_username}:#{cloud_password}",
              "modules" => [{ "name" => "hello",
                                          'var.elasticsearch.hosts' => modules_es_url,
                                          'var.elasticsearch.username' => modules_es_username,
                                          'var.elasticsearch.password' => modules_es_password}]}
        }

        it_behaves_like 'elasticsearch options hash is populated without security'
      end

      context 'when only modules cli and yaml are set' do
        let(:modules_cli_url) { ['cli:9200']}
        let(:modules_cli_username) { 'cli_user' }
        let(:modules_cli_password) { 'cli_password'}
        let(:expected_url) { modules_cli_url }
        let(:expected_username) { modules_cli_username }
        let(:expected_password) { modules_cli_password }
        let(:settings) { {"modules.cli" => [{ "name" => "hello",
                                              'var.elasticsearch.hosts' => modules_cli_url,
                                              'var.elasticsearch.username' => modules_cli_username,
                                              'var.elasticsearch.password' => modules_cli_password}],
                          "modules" => [{ "name" => "hello",
                                           'var.elasticsearch.hosts' => modules_es_url,
                                           'var.elasticsearch.username' => modules_es_username,
                                           'var.elasticsearch.password' => modules_es_password}]}
        }

        it_behaves_like 'elasticsearch options hash is populated without security'
      end


      context 'when everything is set' do
        let(:cloud_name) { 'thebigone'}
        let(:cloud_domain) { 'elastic.co'}
        let(:base64_encoded) { Base64.urlsafe_encode64("#{cloud_domain}$#{cloud_name}$ignored")}
        let(:cloud_id) { "label:#{base64_encoded}" }
        let(:cloud_username) { 'cloudy' }
        let(:cloud_password) { 'cloud_password'}
        let(:modules_cli_url) { ['cli:9200']}
        let(:modules_cli_username) { 'cli_user' }
        let(:modules_cli_password) { 'cli_password'}
        let(:settings) do
          { "modules" => [{ "name" => "hello",
                            'var.elasticsearch.hosts' => modules_es_url,
                            'var.elasticsearch.username' => modules_es_username,
                            'var.elasticsearch.password' => modules_es_password}],
            "modules.cli" => [{ "name" => "hello",
                                 'var.elasticsearch.hosts' => modules_cli_url,
                                 'var.elasticsearch.username' => modules_cli_username,
                                 'var.elasticsearch.password' => modules_cli_password}],
            "cloud.id" => cloud_id,
            "cloud.auth" => "#{cloud_username}:#{cloud_password}",
            "xpack.monitoring.enabled" => true,
            "xpack.monitoring.elasticsearch.hosts" => elasticsearch_url,
            "xpack.monitoring.elasticsearch.username" => elasticsearch_username,
            "xpack.monitoring.elasticsearch.password" => elasticsearch_password,
          }
        end

        it_behaves_like 'elasticsearch options hash is populated without security'
        it_behaves_like 'elasticsearch options hash is populated with secure options'
      end
    end
  end
end
