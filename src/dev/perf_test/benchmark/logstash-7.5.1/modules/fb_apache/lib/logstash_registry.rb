LogStash::PLUGIN_REGISTRY.add(:modules, "fb_apache", LogStash::Modules::Scaffold.new("fb_apache", File.join(File.dirname(__FILE__), "..", "configuration")))
