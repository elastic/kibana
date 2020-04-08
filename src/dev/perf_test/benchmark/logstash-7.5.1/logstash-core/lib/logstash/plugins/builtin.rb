module ::LogStash::Plugins::Builtin
  require 'logstash/plugins/builtin/pipeline/input'
  require 'logstash/plugins/builtin/pipeline/output'

  LogStash::PLUGIN_REGISTRY.add(:input, "pipeline", LogStash::Plugins::Builtin::Pipeline::Input)
  LogStash::PLUGIN_REGISTRY.add(:output, "pipeline", LogStash::Plugins::Builtin::Pipeline::Output)
end