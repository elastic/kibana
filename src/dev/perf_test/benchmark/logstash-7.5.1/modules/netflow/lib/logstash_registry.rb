LogStash::PLUGIN_REGISTRY.add(:modules, "netflow", LogStash::Modules::Scaffold.new("netflow", File.join(File.dirname(__FILE__), "..", "configuration")))
