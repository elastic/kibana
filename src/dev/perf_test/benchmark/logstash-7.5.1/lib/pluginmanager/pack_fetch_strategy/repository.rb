# encoding: utf-8
# In the context of the plugin manager no dependencies are currently loaded.
# So we have to manually require the version file
require_relative "../../../logstash-core/lib/logstash/version"
require "pluginmanager/pack_installer/remote"
require "pluginmanager/utils/http_client"
require "pluginmanager/ui"
require "net/http"
require "uri"

module LogStash module PluginManager module PackFetchStrategy
  class Repository
    DEFAULT_PACK_URL = "https://artifacts.elastic.co/downloads/logstash-plugins"
    PACK_EXTENSION = "zip"

    class << self
      def elastic_pack_base_uri
        env_url = ENV["LOGSTASH_PACK_URL"]
        (env_url.nil? || env_url.empty?) ? DEFAULT_PACK_URL : env_url
      end

      def pack_uri(plugin_name)
        url = "#{elastic_pack_base_uri}/#{plugin_name}/#{plugin_name}-#{LOGSTASH_VERSION}.#{PACK_EXTENSION}"
        URI.parse(url)
      end

      def get_installer_for(plugin_name)
        uri = pack_uri(plugin_name)

        PluginManager.ui.debug("Looking if package named: #{plugin_name} exists at #{uri}")

        if Utils::HttpClient.remote_file_exist?(uri)
          PluginManager.ui.debug("Found package at: #{uri}")
          return LogStash::PluginManager::PackInstaller::Remote.new(uri)
        else
          PluginManager.ui.debug("Package not found at: #{uri}")
          return nil
        end
      rescue SocketError, Errno::ECONNREFUSED, Errno::EHOSTUNREACH => e
        # This probably means there is a firewall in place of the proxy is not correctly configured.
        # So lets skip this strategy but log a meaningful errors.
        PluginManager.ui.debug("Network error, skipping Elastic pack, exception: #{e}")

        return nil
      end
    end
  end
end end end
