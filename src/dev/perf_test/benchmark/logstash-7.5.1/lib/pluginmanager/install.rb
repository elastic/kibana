# encoding: utf-8
require "pluginmanager/command"
require "pluginmanager/install_strategy_factory"
require "pluginmanager/ui"
require "pluginmanager/errors"
require "jar-dependencies"
require "jar_install_post_install_hook"
require "fileutils"

class LogStash::PluginManager::Install < LogStash::PluginManager::Command
  parameter "[PLUGIN] ...", "plugin name(s) or file", :attribute_name => :plugins_arg
  option "--version", "VERSION", "version of the plugin to install"
  option "--[no-]verify", :flag, "verify plugin validity before installation", :default => true
  option "--preserve", :flag, "preserve current gem options", :default => false
  option "--development", :flag, "install all development dependencies of currently installed plugins", :default => false
  option "--local", :flag, "force local-only plugin installation. see bin/logstash-plugin package|unpack", :default => false

  # the install logic below support installing multiple plugins with each a version specification
  # but the argument parsing does not support it for now so currently if specifying --version only
  # one plugin name can be also specified.
  def execute
    # Turn off any jar dependencies lookup when running with `--local`
    ENV["JARS_SKIP"] = "true" if local?

    # This is a special flow for PACK related plugins,
    # if we dont detect an pack we will just use the normal `Bundle install` Strategy`
    # this could be refactored into his own strategy
    begin
      if strategy = LogStash::PluginManager::InstallStrategyFactory.create(plugins_arg)
        LogStash::PluginManager.ui.debug("Installing with strategy: #{strategy.class}")
        strategy.execute
        return
      end
    rescue LogStash::PluginManager::InstallError => e
      report_exception("An error occured when installing the: #{plugins_args_human}, to have more information about the error add a DEBUG=1 before running the command.", e.original_exception)
      return
    rescue LogStash::PluginManager::FileNotFoundError => e
      report_exception("File not found for: #{plugins_args_human}", e)
      return
    rescue LogStash::PluginManager::InvalidPackError => e
      report_exception("Invalid pack for: #{plugins_args_human}, reason: #{e.message}", e)
      return
    rescue => e
      report_exception("Something went wrong when installing #{plugins_args_human}", e)
      return
    end

    # TODO(ph): refactor this into his own strategy
    validate_cli_options!

    if local_gems?
      gems = extract_local_gems_plugins
    elsif development?
      gems = plugins_development_gems
    else
      gems = plugins_gems
      verify_remote!(gems) if !local? && verify?
    end

    check_for_integrations(gems)
    install_gems_list!(gems)
    remove_unused_locally_installed_gems!
    remove_unused_integration_overlaps!
  end

  private

  def remove_unused_integration_overlaps!
    installed_plugin_specs = plugins_arg.flat_map do |plugin_arg|
      if LogStash::PluginManager.plugin_file?(plugin_arg)
        LogStash::PluginManager.plugin_file_spec(plugin_arg)
      else
        LogStash::PluginManager.find_plugins_gem_specs(plugin_arg)
      end
    end.select do |spec|
      LogStash::PluginManager.integration_plugin_spec?(spec)
    end.flat_map do |spec|
      LogStash::PluginManager.integration_plugin_provides(spec)
    end.select do |plugin_name|
      LogStash::PluginManager.installed_plugin?(plugin_name, gemfile)
    end.each do |plugin_name|
      puts "Removing '#{plugin_name}' since it is provided by an integration plugin"
      ::Bundler::LogstashUninstall.uninstall!(plugin_name)
    end
  end

  def check_for_integrations(gems)
    gems.each do |plugin, _version|
      integration_plugin = LogStash::PluginManager.which_integration_plugin_provides(plugin, gemfile)
      if integration_plugin
        signal_error("Installation aborted, plugin '#{plugin}' is already provided by '#{integration_plugin.name}'")
      end
    end
  end

  def validate_cli_options!
    if development?
      signal_usage_error("Cannot specify plugin(s) with --development, it will add the development dependencies of the currently installed plugins") unless plugins_arg.empty?
    else
      signal_usage_error("No plugin specified") if plugins_arg.empty? && verify?
      # TODO: find right syntax to allow specifying list of plugins with optional version specification for each
      signal_usage_error("Only 1 plugin name can be specified with --version") if version && plugins_arg.size > 1
    end
    signal_error("File #{LogStash::Environment::GEMFILE_PATH} does not exist or is not writable, aborting") unless ::File.writable?(LogStash::Environment::GEMFILE_PATH)
  end

  # Check if the specified gems contains
  # the logstash `metadata`
  def verify_remote!(gems)
    options = { :rubygems_source => gemfile.gemset.sources }
    gems.each do |plugin, version|
      puts("Validating #{[plugin, version].compact.join("-")}")
      next if validate_plugin(plugin, version, options)
      signal_error("Installation aborted, verification failed for #{plugin} #{version}")
    end
  end

  def validate_plugin(plugin, version, options)
    LogStash::PluginManager.logstash_plugin?(plugin, version, options)
  rescue SocketError
    false
  end

  def plugins_development_gems
    # Get currently defined gems and their dev dependencies
    specs = []

    specs = LogStash::PluginManager.all_installed_plugins_gem_specs(gemfile)

    # Construct the list of dependencies to add to the current gemfile
    specs.each_with_object([]) do |spec, install_list|
      dependencies = spec.dependencies
        .select { |dep| dep.type == :development }
        .map { |dep| [dep.name] + dep.requirement.as_list }

      install_list.concat(dependencies)
    end
  end

  def plugins_gems
    version ? [plugins_arg << version] : plugins_arg.map { |plugin| [plugin, nil] }
  end

  # install_list will be an array of [plugin name, version, options] tuples, version it
  # can be nil at this point we know that plugins_arg is not empty and if the
  # --version is specified there is only one plugin in plugins_arg
  #
  def install_gems_list!(install_list)
    # If something goes wrong during the installation `LogStash::Gemfile` will restore a backup version.
    install_list = LogStash::PluginManager.merge_duplicates(install_list)

    # Add plugins/gems to the current gemfile
    puts("Installing" + (install_list.empty? ? "..." : " " + install_list.collect(&:first).join(", ")))
    install_list.each do |plugin, version, options|
      plugin_gem = gemfile.find(plugin)
      if preserve?
        puts("Preserving Gemfile gem options for plugin #{plugin}") if plugin_gem && !plugin_gem.options.empty?
        gemfile.update(plugin, version, options)
      else
        gemfile.overwrite(plugin, version, options)
      end
    end

    # Sync gemfiles changes to disk to make them available to the `bundler install`'s API
    gemfile.save

    bundler_options = {:install => true}
    bundler_options[:without] = [] if development?
    bundler_options[:rubygems_source] = gemfile.gemset.sources
    bundler_options[:local] = true if local?

    output = LogStash::Bundler.invoke!(bundler_options)

    puts("Installation successful")
  rescue => exception
    gemfile.restore!
    report_exception("Installation Aborted", exception)
  ensure
    display_bundler_output(output)
  end

  # Extract the specified local gems in a predefined local path
  # Update the gemfile to use a relative path to this plugin and run
  # Bundler, this will mark the gem not updatable by `bin/logstash-plugin update`
  # This is the most reliable way to make it work in bundler without
  # hacking with `how bundler works`
  #
  # Bundler 2.0, will have support for plugins source we could create a .gem source
  # to support it.
  def extract_local_gems_plugins
    FileUtils.mkdir_p(LogStash::Environment::CACHE_PATH)
    plugins_arg.collect do |plugin|
      # We do the verify before extracting the gem so we dont have to deal with unused path
      if verify?
        puts("Validating #{plugin}")
        signal_error("Installation aborted, verification failed for #{plugin}") unless LogStash::PluginManager.logstash_plugin?(plugin, version)
      end

      # Make the original .gem available for the prepare-offline-pack,
      # paquet will lookup in the cache directory before going to rubygems.
      FileUtils.cp(plugin, ::File.join(LogStash::Environment::CACHE_PATH, ::File.basename(plugin)))
      package, path = LogStash::Rubygems.unpack(plugin, LogStash::Environment::LOCAL_GEM_PATH)
      [package.spec.name, package.spec.version, { :path => relative_path(path) }, package.spec]
    end
  end

  # We cannot install both .gem and normal plugin in one call of `plugin install`
  def local_gems?
    return false if plugins_arg.empty?

    local_gem = plugins_arg.collect { |plugin| ::File.extname(plugin) == ".gem" }.uniq

    if local_gem.size == 1
      return local_gem.first
    else
      signal_usage_error("Mixed source of plugins, you can't mix local `.gem` and remote gems")
    end
  end

  def plugins_args_human
    plugins_arg.join(", ")
  end
end # class Logstash::PluginManager
