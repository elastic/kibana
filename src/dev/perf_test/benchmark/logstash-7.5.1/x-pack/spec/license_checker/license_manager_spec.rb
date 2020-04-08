# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License;
# you may not use this file except in compliance with the Elastic License.

require "spec_helper"
require "logstash/json"
require "license_checker/license_manager"
require 'monitoring/monitoring'

class Observer
  attr_reader :xpack_info

  def initialize(xpack_info)
    @xpack_info = xpack_info
  end

  def update(xpack_info)
    @xpack_info = xpack_info
  end
end

describe LogStash::LicenseChecker::LicenseManager do
  let(:subject) { described_class.new(license_reader, 'monitoring') }
  let(:status) { "active"}
  let(:type) { 'trial' }

  let(:issue_date) { Time.now - ONE_DAY }
  let(:expiry_date) { Time.now + ONE_DAY }
  let(:max_nodes) { 1000 }
  let(:issued_to) { "logstasher" }
  let(:issuer) { "elasticsearch"}
  let(:start_date_in_millis) { -1 }
  let(:extension) { LogStash::MonitoringExtension.new }
  let(:system_settings) { LogStash::Runner::SYSTEM_SETTINGS.clone }
  let(:elasticsearch_url) { ["https://localhost:9898"] }
  let(:elasticsearch_username) { "elastictest" }
  let(:elasticsearch_password) { "testchangeme" }
  let(:license_reader) { double ('license_reader')}
  let(:license_status) { 'active'}
  let(:license_type) { 'trial' }
  let(:expiry_in_millis) { expiry_date.to_i * 1000 }
  let(:license_response) {
    LogStash::Json.load("{
              \"license\": {
                \"status\": \"#{license_status}\",
                \"uid\": \"9a48c67c-ce2c-4169-97bf-37d324b8ab80\",
                \"type\": \"#{license_type}\",
                \"issue_date\": \"2017-07-11T01:35:23.584Z\",
                \"issue_date_in_millis\": 1499736923584,
                \"expiry_date\": \"#{expiry_date.to_s}\",
                \"expiry_date_in_millis\": #{expiry_in_millis},
                \"max_nodes\": 1000,
                \"issued_to\": \"x-pack-elasticsearch_plugin_run\",
                \"issuer\": \"elasticsearch\",
                \"start_date_in_millis\": -1
              }
            }")
  }

  let(:no_xpack_response) {
    LogStash::Json.load("{
   \"error\": {
      \"root_cause\":
        [{
          \"type\":\"index_not_found_exception\",
          \"reason\": \"no such index\",
          \"resource.type\": \"index_or_alias\",
          \"resource.id\": \"_xpack\",
          \"index_uuid\": \"_na_\",
          \"index\": \"_xpack\"
        }],
        \"type\": \"index_not_found_exception\",
        \"reason\": \"no such index\",
        \"resource.type\": \"index_or_alias\",
        \"resource.id\": \"_xpack\",
        \"index_uuid\": \"_na_\",
        \"index\": \"_xpack\"
      },
      \"status\": 404}
    }")
  }

  let(:settings) do
    {
        "xpack.monitoring.enabled" => true,
        "xpack.monitoring.elasticsearch.hosts" => elasticsearch_url,
        "xpack.monitoring.elasticsearch.username" => elasticsearch_username,
        "xpack.monitoring.elasticsearch.password" => elasticsearch_password,
    }
  end

  let(:license) do
      {
          "license" => {
          "status" => status,
          "uid" => SecureRandom.uuid,
          "type" => type,
          "issue_date" => issue_date,
          "issue_date_in_millis" => issue_date.to_i * 1000,
          "expiry_date" => expiry_date,
          "expiry_date_in_millis" => expiry_date.to_i * 1000,
          "max_nodes" => max_nodes,
          "issued_to" => issued_to,
          "issuer" => issuer,
          "start_date_in_millis" => start_date_in_millis
          }
      }
    end

  before do
    extension.additionals_settings(system_settings)
    apply_settings(settings, system_settings)
  end

  context 'observers' do
    let(:observer) { Observer.new(xpack_info) }
    let(:xpack_info) { LogStash::LicenseChecker::XPackInfo.from_es_response(license) }

    before(:each) do
      expect(license_reader).to receive(:fetch_xpack_info).and_return(xpack_info)
      subject.add_observer(observer)
    end

    context 'when the type changes' do
      let(:new_type) { 'basic' }
      let(:second_license) do
        { 'license' => license['license'].merge( { 'type' => new_type })}
      end

      it 'updates observers' do
        expect(license_reader).to receive(:fetch_xpack_info).and_return LogStash::LicenseChecker::XPackInfo.from_es_response(second_license)

        expect(observer.xpack_info.license_type).to eq type
        subject.fetch_xpack_info
        expect(observer.xpack_info.license_type).to eq new_type
      end
    end

    context 'when the status changes' do
      let(:new_status) { 'expired' }
      let(:second_license) do
        { 'license' => license['license'].merge( { 'status' => new_status })}
      end
      it 'updates observers' do
        expect(license_reader).to receive(:fetch_xpack_info).and_return LogStash::LicenseChecker::XPackInfo.from_es_response(second_license)

        expect(observer.xpack_info.license_status).to eq status
        subject.fetch_xpack_info
        expect(observer.xpack_info.license_status).to eq new_status
      end
    end

    context 'when the license goes from not-loaded to loaded' do
      let(:xpack_info) { LogStash::LicenseChecker::XPackInfo.xpack_not_installed }

      it 'updates observers' do
        expect(license_reader).to receive(:fetch_xpack_info).and_return LogStash::LicenseChecker::XPackInfo.from_es_response(license)

        expect(observer.xpack_info).to eq LogStash::LicenseChecker::XPackInfo.xpack_not_installed
        subject.fetch_xpack_info
        expect(observer.xpack_info).to eq LogStash::LicenseChecker::XPackInfo.from_es_response(license)
      end
    end

    context 'when the license goes from loaded to not-loaded' do
      it 'updates observers' do
        expect(license_reader).to receive(:fetch_xpack_info).and_return LogStash::LicenseChecker::XPackInfo.xpack_not_installed

        expect(observer.xpack_info).to eq LogStash::LicenseChecker::XPackInfo.from_es_response(license)
        subject.fetch_xpack_info
        expect(observer.xpack_info).to eq LogStash::LicenseChecker::XPackInfo.xpack_not_installed
      end
    end
  end
end
