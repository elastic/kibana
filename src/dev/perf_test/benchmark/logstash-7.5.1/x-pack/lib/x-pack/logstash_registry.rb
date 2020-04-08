# Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
# or more contributor license agreements. Licensed under the Elastic License;
# you may not use this file except in compliance with the Elastic License.

require "logstash/runner" # needed for LogStash::XPACK_PATH
xpack_modules = ["azure", "arcsight"]
xpack_modules.each do |name|
  $LOAD_PATH << File.join(LogStash::XPACK_PATH, "modules", name, "lib")
end
require "logstash/plugins/registry"
require "logstash/modules/util"
require "monitoring/monitoring"
require "monitoring/inputs/metrics"
require "config_management/extension"
require "modules/xpack_scaffold"
require "filters/azure_event"

LogStash::PLUGIN_REGISTRY.add(:input, "metrics", LogStash::Inputs::Metrics)
LogStash::PLUGIN_REGISTRY.add(:universal, "monitoring", LogStash::MonitoringExtension)
LogStash::PLUGIN_REGISTRY.add(:universal, "config_management", LogStash::ConfigManagement::Extension)

license_levels = Hash.new
license_levels.default = ["basic", "trial", "standard", "gold", "platinum"]

xpack_modules.each do |name|
  path = File.join(File.dirname(__FILE__), "..", "..", "modules", name, "configuration")
  LogStash::PLUGIN_REGISTRY.add(:modules, name,
    LogStash::Modules::XpackScaffold.new(name, path, license_levels[name]))
end

LogStash::PLUGIN_REGISTRY.add(:filter, "azure_event", LogStash::Filters::AzureEvent)
