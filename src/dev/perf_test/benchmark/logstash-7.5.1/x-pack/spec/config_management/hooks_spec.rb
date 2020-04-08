# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License;
# you may not use this file except in compliance with the Elastic License.

require 'spec_helper'
require "logstash/runner"
require "config_management/hooks"
require "config_management/elasticsearch_source"
require "config_management/bootstrap_check"
require "config_management/extension"

describe LogStash::ConfigManagement::Hooks do
  subject(:runner) { LogStash::Runner.new("") }
  let(:hooks) { described_class.new }

  let(:settings) do
    {
      "xpack.management.enabled" => true,
      "xpack.management.elasticsearch.password" => "testpassword"
    }
  end

  before do
    system_settings = LogStash::Runner::SYSTEM_SETTINGS.clone
    stub_const("LogStash::SETTINGS", system_settings)
    extension = LogStash::ConfigManagement::Extension.new
    extension.additionals_settings(system_settings)
    apply_settings(settings, system_settings)
  end

  context do
    before do
      hooks.before_bootstrap_checks(runner)
    end

    it "removes the default config bootstrap" do
      expect(runner.bootstrap_checks).not_to include(LogStash::BootstrapCheck::DefaultConfig)
    end

    it "adds the config management bootstrap check add the end" do
      expect(runner.bootstrap_checks).to include(LogStash::ConfigManagement::BootstrapCheck)
    end
  end

  context do
    before do
      allow_any_instance_of(LogStash::ConfigManagement::ElasticsearchSource).to receive(:setup_license_checker)
      allow_any_instance_of(LogStash::ConfigManagement::ElasticsearchSource).to receive(:license_check)
      hooks.after_bootstrap_checks(runner)
    end

    it "adds the `ElasticsearchSource` to the source_loader" do
      expect(runner.source_loader.sources).to include(LogStash::ConfigManagement::ElasticsearchSource)
    end

    it "remove the local source" do
      expect(runner.source_loader.sources.select { |source| source.is_a?(LogStash::Config::Source::Local) }.any?).to be_falsey
    end

    it "remove the Multilocal source" do
      expect(runner.source_loader.sources.select { |source| source.is_a?(LogStash::Config::Source::MultiLocal) }.any?).to be_falsey
    end

    it "remove the Modules source" do
      expect(runner.source_loader.sources.select { |source| source.is_a?(LogStash::Config::Source::Modules) }.any?).to be_falsey
    end
  end
end
