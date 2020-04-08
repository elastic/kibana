# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License;
# you may not use this file except in compliance with the Elastic License.

require "spec_helper"
require "logstash/json"
require "license_checker/x_pack_info"
require 'monitoring/monitoring'

class Observer
  attr_reader :license
  def initialize
    @license = nil
  end

  def update(license)
    @license = license
  end
end

describe LogStash::LicenseChecker::XPackInfo do
  ONE_HOUR = (60 * 60)
  ONE_DAY = (60 * 60 * 24)

  let(:subject) { described_class.new(license) }
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
    end

  before do
    extension.additionals_settings(system_settings)
    apply_settings(settings, system_settings)
  end

  shared_examples_for "available? returns correctly" do |expected_availability|
    it "should return #{expected_availability}" do
      expect(subject.license_available?).to be expected_availability
    end
  end

  shared_examples_for "active? returns correctly" do |expected_active|
    it "should return #{expected_active}?" do
      expect(subject.license_active?).to be expected_active
    end
  end

  shared_examples_for "one_of? returns correctly" do |type, expected_one_of|
    it "#{type} should return #{expected_one_of}" do
      expect(subject.license_one_of?(type)).to be expected_one_of
    end
  end


  context "when the license type is valid" do
    context 'the license has expired' do
      let(:expiry_date) { Time.now - ONE_HOUR }
      let(:status) { 'expired' }
      it_behaves_like 'available? returns correctly', true
      it_behaves_like 'active? returns correctly', false
      it_behaves_like 'one_of? returns correctly', %w(basic trial standard gold platinum), true
    end

    context 'the license is active' do
      let(:status) { 'active' }
      it_behaves_like 'available? returns correctly', true
      it_behaves_like 'active? returns correctly', true
      it_behaves_like 'one_of? returns correctly', %w(basic trial standard gold platinum), true
    end
  end

  context "when the license type is invalid" do
    context 'the license has expired' do
      let(:expiry_date) { Time.now - ONE_HOUR }
      let(:status) { 'expired' }
      it_behaves_like 'available? returns correctly', true
      it_behaves_like 'active? returns correctly', false
      it_behaves_like 'one_of? returns correctly', %w(basic), false
    end

    context 'the license is active' do
      let(:status) { 'active' }
      it_behaves_like 'available? returns correctly', true
      it_behaves_like 'active? returns correctly', true
      it_behaves_like 'one_of? returns correctly', %w(basic), false
    end
  end
end
