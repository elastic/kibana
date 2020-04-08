# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License;
# you may not use this file except in compliance with the Elastic License.

require "spec_helper"
require "stud/temporary"
require "logstash/config/source_loader"
require "config_management/extension"
require "config_management/bootstrap_check"

describe LogStash::ConfigManagement::BootstrapCheck do
  let(:extension) { LogStash::ConfigManagement::Extension.new }

  let(:system_settings) { LogStash::Runner::SYSTEM_SETTINGS.clone }

  subject { described_class }

  before do
    # Make sure the new settings options provided by
    # the extension are now available to be set
    extension.additionals_settings(system_settings)
  end

  context "when `xpack.management.enabled` is `TRUE`" do
    let(:interval) { 6 }
    let(:settings) do
      apply_settings(
        {
          "xpack.management.enabled" => true,
          "xpack.management.logstash.poll_interval" => "#{interval}s"
        },
        system_settings
      )
    end

    it "sets `config.reload.automatic` to `TRUE`" do
      expect { subject.check(settings) }
        .to change { settings.get_value("config.reload.automatic") }.from(false).to(true)
    end

    it "sets the `config.reload.interval`" do
      expect { subject.check(settings) }
        .to change { settings.get_value("config.reload.interval") }.to(interval * 1_000_000_000)
    end


    context "when `config.string` is given" do
      let(:settings) do
        apply_settings(
          {
            "xpack.management.enabled" => true,
            "config.string" => "input { generator {}} output { null {} }"
          },
          system_settings
        )
      end

      it "raises a `LogStash::BootstrapCheckError` error" do
        expect { subject.check(settings) }.to raise_error LogStash::BootstrapCheckError
      end
    end

    context "when `config.test_and_exit` is given" do
      let(:settings) do
        apply_settings(
          {
            "xpack.management.enabled" => true,
            "config.test_and_exit" => true
          },
          system_settings
        )
      end

      it "raises a `LogStash::BootstrapCheckError` error" do
        expect { subject.check(settings) }.to raise_error LogStash::BootstrapCheckError
      end
    end

    context "when `modules.cli` is given" do
      let(:settings) do
        apply_settings(
          {
            "xpack.management.enabled" => true,
            "modules.cli" => [{ "name" => "hello" }]
          },
          system_settings
        )
      end

      it "raises a `LogStash::BootstrapCheckError` error" do
        expect { subject.check(settings) }.to raise_error LogStash::BootstrapCheckError
      end
    end

    context "when `modules` is given" do
      let(:settings) do
        apply_settings(
          {
            "xpack.management.enabled" => true,
            "modules" => [{ "name" => "hello" }]
          },
          system_settings
        )
      end

      it "raises a `LogStash::BootstrapCheckError` error" do
        expect { subject.check(settings) }.to raise_error LogStash::BootstrapCheckError
      end
    end

    context "when `path.config` is given" do
      let(:settings) do
        apply_settings(
            {
                "xpack.management.enabled" => true,
                "path.config" => config_location
            },
            system_settings
        )
      end

      context 'when a configuration file exists in the specified location' do
        let(:config_location) { Stud::Temporary.file.path }

        it "raises a `LogStash::BootstrapCheckError` error" do
          expect { subject.check(settings) }.to raise_error LogStash::BootstrapCheckError
        end
      end

      context 'when a configuration file exists in the specified folder' do
        let(:config_location) { "#{File.dirname(Stud::Temporary.file.path)}/*" }

        it "raises a `LogStash::BootstrapCheckError` error" do
          expect { subject.check(settings) }.to raise_error LogStash::BootstrapCheckError
        end
      end

      context 'when no configuration file exists in the location' do
        let(:config_location) { "/non_existent_directory/*.conf"}

        it "does not raise a `LogStash::BootstrapCheckError` error" do
          expect { subject.check(settings) }.to_not raise_error
        end
      end
    end

    context "when `xpack.management.pipeline.id` is missing" do
      context "when using an empty string" do
        let(:settings) do
          apply_settings(
            {
              "xpack.management.enabled" => true,
              "xpack.management.pipeline.id" => ""
            },
            system_settings
          )
        end

        it "raises a `LogStash::BootstrapCheckError`" do
          expect { subject.check(settings) }.to raise_error LogStash::BootstrapCheckError
        end
      end

      context "when using an empty array" do
        let(:settings) do
          apply_settings(
            {
              "xpack.management.enabled" => true,
              "xpack.management.pipeline.id" => []
            },
            system_settings
          )
        end

        it "raises a `LogStash::BootstrapCheckError`" do
          expect { subject.check(settings) }.to raise_error LogStash::BootstrapCheckError
        end
      end

      context "when defining duplicate ids" do
        let(:pipeline_ids) { ["pipeline1", "pipeline2", "pipeline1"] }
        let(:settings) do
          apply_settings(
            {
              "xpack.management.enabled" => true,
              "xpack.management.pipeline.id" => pipeline_ids
            },
            system_settings
          )
        end

        it "raises a `LogStash::BootstrapCheckError` with the duplicate ids" do
          expect { subject.check(settings) }.to raise_error LogStash::BootstrapCheckError, /pipeline1/
        end
      end

      context "when defining duplicate ids with different capitalization" do
        let(:pipeline_ids) { ["pipeline1", "pipeline2", "PIPELINE1"] }
        let(:settings) do
          apply_settings(
            {
              "xpack.management.enabled" => true,
              "xpack.management.pipeline.id" => pipeline_ids
            },
            system_settings
          )
        end

        it "raises a `LogStash::BootstrapCheckError` with the duplicate ids" do
          expect { subject.check(settings) }.to raise_error LogStash::BootstrapCheckError, /pipeline1, PIPELINE1/
        end
      end
    end
  end
end
