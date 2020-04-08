# encoding: utf-8
module LogStash module PluginManager
    class PluginManagerError < StandardError; end
    class PluginNotFoundError < PluginManagerError; end
    class UnpackablePluginError < PluginManagerError; end
    class FileNotFoundError < PluginManagerError; end
    class InvalidPackError < PluginManagerError; end
    class InstallError < PluginManagerError
      attr_reader :original_exception

      def initialize(original_exception)
        @original_exception = original_exception
      end
    end
end end
