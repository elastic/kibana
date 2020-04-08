# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License;
# you may not use this file except in compliance with the Elastic License.

require "modules/module_license_checker"
require "logstash/modules/settings_merger"
require 'license_checker/x_pack_info'

describe LogStash::LicenseChecker::ModuleLicenseChecker do


  let(:settings) { LogStash::Runner::SYSTEM_SETTINGS }


  shared_examples "can not get a license" do

    before(:each) {
      expect(subject).to receive(:license_reader).and_return(mock_reader)
      expect(mock_reader).to receive(:fetch_xpack_info).and_return(LogStash::LicenseChecker::XPackInfo.failed_to_fetch)

    }
    let(:mock_reader) {double("reader")}

    it "can't get a license" do
      expect(subject.check(settings)).to be_falsey
    end
  end

  shared_examples "can get a license" do
    before(:each) {
      expect(subject).to receive(:license_reader).and_return(mock_reader)
      expect(mock_reader).to receive(:fetch_xpack_info).and_return(xpack_info)
    }
    let(:mock_reader) {double("reader")}
    let(:xpack_info) {LogStash::LicenseChecker::XPackInfo.from_es_response(license)}
    let(:issue_date) {Time.now - 86400}
    let(:expiry_date) {Time.now + 86400}
    let(:license) do
      {
          "license" => {
              "status" => "active",
              "uid" => SecureRandom.uuid,
              "type" => returned_license,
              "issue_date" => issue_date,
              "issue_date_in_millis" => issue_date.to_i * 1000,
              "expiry_date" => expiry_date,
              "expiry_date_in_millis" => expiry_date.to_i * 1000,
              "max_nodes" => 1000,
              "issued_to" => "logstasher",
              "issuer" => "elasticsearch",
              "start_date_in_millis" => -1
          }
      }
    end
  end

  context "any license" do
    let(:subject) {LogStash::LicenseChecker::ModuleLicenseChecker.new(name,  ["basic", "trial", "standard", "gold", "platinum"])}
    let(:returned_license) {"basic"}
    let(:name) {"foo_module"}
    let(:settings) do
      LogStash::SETTINGS.clone.tap do |settings|
        settings.set("modules", [{}])
      end
    end
    include_examples "can get a license"

    it "has valid license" do
      expect(subject.check(settings)).to be_truthy
    end
  end

  context "platinum license" do
    let(:subject) {LogStash::LicenseChecker::ModuleLicenseChecker.new(name,  ["platinum"])}
    let(:returned_license) {"platinum"}
    let(:name) {"foo_module"}
    let(:settings) do
      LogStash::SETTINGS.clone.tap do |settings|
        settings.set("modules", [{}])
      end
    end
    include_examples "can get a license"

    it "has valid license" do
      expect(subject.check(settings)).to be_truthy
    end
  end

  context "wrong license" do
    let(:subject) {LogStash::LicenseChecker::ModuleLicenseChecker.new(name,  ["platinum"])}
    let(:returned_license) {"basic"}
    let(:name) {"foo_module"}
    let(:settings) do
      LogStash::SETTINGS.clone.tap do |settings|
        settings.set("modules", [{}])
      end
    end
    include_examples "can get a license"

    it "does not have valid license" do
      expect(subject.check(settings)).to be_falsey
    end
  end

  context "no license" do
    let(:subject) {LogStash::LicenseChecker::ModuleLicenseChecker.new(name,  ["basic", "trial", "standard", "gold", "platinum"])}
    let(:name) {"foo_module"}
    let(:settings) do
      LogStash::SETTINGS.clone.tap do |settings|
        settings.set("modules", [{}])
      end
    end
    include_examples "can not get a license"
  end

end
