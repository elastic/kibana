# encoding: utf-8
require "pluginmanager/bundler/logstash_uninstall"
require "pluginmanager/x_pack_interceptor.rb"
require "pluginmanager/command"

class LogStash::PluginManager::Remove < LogStash::PluginManager::Command
  parameter "PLUGIN", "plugin name"

  def execute
    signal_error("File #{LogStash::Environment::GEMFILE_PATH} does not exist or is not writable, aborting") unless File.writable?(LogStash::Environment::GEMFILE_PATH)

    ##
    # Need to setup the bundler status to enable uninstall of plugins
    # installed as local_gems, otherwise gem:specification is not
    # finding the plugins
    ##
    LogStash::Bundler.setup!({:without => [:build, :development]})

    # If a user is attempting to uninstall X-Pack, present helpful output to guide
    # them toward the OSS-only distribution of Logstash
    LogStash::PluginManager::XPackInterceptor::Remove.intercept!(plugin)

    # if the plugin is provided by an integration plugin. abort.
    if integration_plugin = LogStash::PluginManager.which_integration_plugin_provides(plugin, gemfile)
      signal_error("This plugin is already provided by '#{integration_plugin.name}' so it can't be removed individually")
    end

    # make sure this is an installed plugin and present in Gemfile.
    # it is not possible to uninstall a dependency not listed in the Gemfile, for example a dependent codec
    signal_error("This plugin has not been previously installed") unless LogStash::PluginManager.installed_plugin?(plugin, gemfile)

    exit(1) unless ::Bundler::LogstashUninstall.uninstall!(plugin)

    remove_unused_locally_installed_gems!
  rescue => exception
    report_exception("Operation aborted, cannot remove plugin", exception)
  end
end
