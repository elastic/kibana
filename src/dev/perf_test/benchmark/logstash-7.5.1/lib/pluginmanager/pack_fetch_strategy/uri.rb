# encoding: utf-8
require "pluginmanager/utils/http_client"
require "pluginmanager/pack_installer/local"
require "pluginmanager/pack_installer/remote"
require "pluginmanager/ui"
require "net/http"
require "uri"

module LogStash module PluginManager module PackFetchStrategy
  class Uri
    class << self
      def get_installer_for(plugin_name)
        begin
          uri =  URI.parse(plugin_name)

          if local?(uri)
            PluginManager.ui.debug("Local file: #{uri.path}")
            return LogStash::PluginManager::PackInstaller::Local.new(uri.path)
          elsif http?(uri)
            PluginManager.ui.debug("Remote file: #{uri}")
            return LogStash::PluginManager::PackInstaller::Remote.new(uri)
          else
            return nil
          end
        rescue URI::InvalidURIError,
          URI::InvalidComponentError,
          URI::BadURIError => e

          PluginManager.ui.debug("Invalid URI for pack, uri: #{uri}")
          return nil
        end
      end

      private
      def http?(uri)
        !uri.scheme.nil? && uri.scheme.match(/^http/)
      end

      def local?(uri)
        !uri.scheme.nil? && uri.scheme == "file"
      end
    end
  end
end end end
