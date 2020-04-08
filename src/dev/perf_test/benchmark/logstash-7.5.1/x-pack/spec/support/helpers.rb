# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License;
# you may not use this file except in compliance with the Elastic License.

require "stud/task"

# Settings' TimeValue is using nanos seconds as the default unit
def time_value(time)
  LogStash::Util::TimeValue.from_value(time).to_nanos
end

# Allow to easily asserts the configuration created
# by the `#additionals_settings` callback
def define_settings(settings_options)
  settings_options.each do |name, options|
    klass, expected_default_value = options

    it "define setting: `#{name} of type: `#{klass}` with a default value of `#{expected_default_value}`" do
      expect { settings.get_setting(name) }.not_to raise_error
      expect(settings.get_setting(name)).to be_kind_of(klass)
      expect(settings.get_default(name)).to eq(expected_default_value)
    end
  end
end

def define_deprecated_and_renamed_settings(settings_map)
  settings_map.each do |deprecated_name, new_name|
    it "define deprecated-and-renamed stub setting: `#{deprecated_name}` with guidance pointing to use `#{new_name}` instead" do
      deprecated_setting = settings.get_setting(deprecated_name)

      expect(deprecated_setting).to be_kind_of(LogStash::Setting::DeprecatedAndRenamed)
      expect(deprecated_setting.name).to eq(deprecated_name)
      expect(deprecated_setting.new_name).to eq(new_name)

      expect { deprecated_setting.set(true) }.to raise_exception(ArgumentError, /deprecated and removed/)
    end
  end
end

def apply_settings(settings_values, settings = nil)
  settings = settings.nil? ? LogStash::SETTINGS.clone : settings

  settings_values.each do |key, value|
    settings.set(key, value)
  end

  settings
end

def start_agent(agent)
  agent_task = Stud::Task.new do
    begin
      agent.execute
    rescue => e
      raise "Start Agent exception: #{e}"
    end
  end

  wait(30).for { agent.running? }.to be(true)
  agent_task
end

module LogStash
  module Inputs
    class DummyBlockingInput < LogStash::Inputs::Base
      config_name "dummyblockinginput"
      milestone 2

      def register
      end

      def run(_)
        sleep(1) while !stop?
      end

      def stop
      end
    end
  end
end
