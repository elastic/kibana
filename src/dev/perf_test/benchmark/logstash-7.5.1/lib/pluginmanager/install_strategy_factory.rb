# encoding: utf-8
require "pluginmanager/ui"
require "pluginmanager/x_pack_interceptor"
require "pluginmanager/pack_fetch_strategy/repository"
require "pluginmanager/pack_fetch_strategy/uri"

module LogStash module PluginManager
  class InstallStrategyFactory
    AVAILABLES_STRATEGIES = [
      LogStash::PluginManager::PackFetchStrategy::Uri,
      LogStash::PluginManager::PackFetchStrategy::Repository
    ]

    def self.create(plugins_args)
      plugin_name_or_uri = plugins_args.first
      return false if plugin_name_or_uri.nil? || plugin_name_or_uri.strip.empty?

      # if the user is attempting to install X-Pack, present helpful output to guide
      # them toward the default distribution of Logstash
      XPackInterceptor::Install.intercept!(plugin_name_or_uri)

      AVAILABLES_STRATEGIES.each do |strategy|
        if installer = strategy.get_installer_for(plugin_name_or_uri)
          return installer
        end
      end
      return false
    end
  end
end end
