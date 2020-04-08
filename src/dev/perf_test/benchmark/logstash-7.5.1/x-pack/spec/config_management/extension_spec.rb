# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License;
# you may not use this file except in compliance with the Elastic License.

require "spec_helper"
require "logstash/environment"
require "logstash/settings"
require "logstash/util/time_value"
require "config_management/extension"
require "config_management/hooks"

describe LogStash::ConfigManagement::Extension do
  let(:extension) { described_class.new }

  describe "#register_hook" do
    subject(:hooks) { LogStash::Plugins::HooksRegistry.new }
    before { extension.register_hooks(hooks) }

    it "register hooks on `LogStash::Runner`" do
      expect(hooks).to have_registered_hook(LogStash::Runner, LogStash::ConfigManagement::Hooks)
    end
  end

  describe "#additionals_settings" do
    subject(:settings) { LogStash::Runner::SYSTEM_SETTINGS.clone }

    before { extension.additionals_settings(settings) }

    describe "#additionals_settings" do
      define_settings(
        "xpack.management.enabled" => [LogStash::Setting::Boolean, false],
        "xpack.management.logstash.poll_interval" => [LogStash::Setting::TimeValue, 5000000000],
        "xpack.management.pipeline.id" => [LogStash::Setting::ArrayCoercible, ["main"]],
        "xpack.management.elasticsearch.hosts" => [LogStash::Setting::ArrayCoercible, ["https://localhost:9200"]],
        "xpack.management.elasticsearch.username" => [LogStash::Setting::String, "logstash_system"],
        "xpack.management.elasticsearch.password" => [LogStash::Setting::String, nil],
        "xpack.management.elasticsearch.ssl.certificate_authority" => [LogStash::Setting::NullableString, nil],
        "xpack.management.elasticsearch.ssl.truststore.path" => [LogStash::Setting::NullableString, nil],
        "xpack.management.elasticsearch.ssl.truststore.password" => [LogStash::Setting::NullableString, nil],
        "xpack.management.elasticsearch.ssl.keystore.path" => [LogStash::Setting::NullableString, nil],
        "xpack.management.elasticsearch.ssl.keystore.password" => [LogStash::Setting::NullableString, nil]
      )

      describe 'deprecated and renamed settings' do
        define_deprecated_and_renamed_settings(
            "xpack.management.elasticsearch.url"    => "xpack.management.elasticsearch.hosts",
            "xpack.management.elasticsearch.ssl.ca" => "xpack.management.elasticsearch.ssl.certificate_authority"
        )
      end
    end
  end
end
