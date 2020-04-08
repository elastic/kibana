# encoding: utf-8
require "pluginmanager/command"
require "jar-dependencies"
require "jar_install_post_install_hook"

class LogStash::PluginManager::Update < LogStash::PluginManager::Command
  REJECTED_OPTIONS = [:path, :git, :github]
  # These are local gems used by LS and needs to be filtered out of other plugin gems
  NON_PLUGIN_LOCAL_GEMS = ["logstash-core", "logstash-core-plugin-api"]

  parameter "[PLUGIN] ...", "Plugin name(s) to upgrade to latest version", :attribute_name => :plugins_arg
  option "--[no-]verify", :flag, "verify plugin validity before installation", :default => true
  option "--local", :flag, "force local-only plugin update. see bin/logstash-plugin package|unpack", :default => false

  def execute
    # Turn off any jar dependencies lookup when running with `--local`
    ENV["JARS_SKIP"] = "true" if local?

    # remove "system" local gems used by LS
    local_gems = gemfile.locally_installed_gems.map(&:name) - NON_PLUGIN_LOCAL_GEMS

    if local_gems.size > 0
      if update_all?
        plugins_with_path = local_gems
      else
        plugins_with_path = plugins_arg & local_gems
      end

      warn_local_gems(plugins_with_path) if plugins_with_path.size > 0
    end
    update_gems!
  end

  private
  def update_all?
    plugins_arg.size == 0
  end

  def warn_local_gems(plugins_with_path)
    puts("Update is not supported for manually defined plugins or local .gem plugin installations, skipping: #{plugins_with_path.join(", ")}")
  end

  def update_gems!
    # If any error is raise inside the block the Gemfile will restore a backup of the Gemfile
    previous_gem_specs_map = find_latest_gem_specs

    # remove any version constrain from the Gemfile so the plugin(s) can be updated to latest version
    # calling update without requirements will remove any previous requirements
    plugins = plugins_to_update(previous_gem_specs_map)
    # Skipping the major version validation when using a local cache as we can have situations
    # without internet connection.
    filtered_plugins = plugins.map { |plugin| gemfile.find(plugin) }
      .compact
      .reject { |plugin| REJECTED_OPTIONS.any? { |key| plugin.options.has_key?(key) } }
      .each   { |plugin| gemfile.update(plugin.name) }

    # force a disk sync before running bundler
    gemfile.save

    puts("Updating #{filtered_plugins.collect(&:name).join(", ")}") unless filtered_plugins.empty?

    # any errors will be logged to $stderr by invoke!
    # Bundler cannot update and clean gems in one operation so we have to call the CLI twice.
    options = {:update => plugins, :rubygems_source => gemfile.gemset.sources}
    options[:local] = true if local?
    output = LogStash::Bundler.invoke!(options)
    # We currently dont removed unused gems from the logstash installation
    # see: https://github.com/elastic/logstash/issues/6339
    # output = LogStash::Bundler.invoke!(:clean => true)
    display_updated_plugins(previous_gem_specs_map)
  rescue => exception
    gemfile.restore!
    report_exception("Updated Aborted", exception)
  ensure
    display_bundler_output(output)
  end

  # create list of plugins to update
  def plugins_to_update(previous_gem_specs_map)
    if update_all?
      previous_gem_specs_map.values.map{|spec| spec.name}
    else
      # If the plugins isn't available in the gemspec or in 
      # the gemfile defined with a local path, we assume the plugins is not
      # installed.
      not_installed = plugins_arg.select{|plugin| !previous_gem_specs_map.has_key?(plugin.downcase) && !gemfile.find(plugin) }
      signal_error("Plugin #{not_installed.join(', ')} is not installed so it cannot be updated, aborting") unless not_installed.empty?
      plugins_arg
    end
  end

  # We compare the before the update and after the update
  def display_updated_plugins(previous_gem_specs_map)
    update_count = 0
    find_latest_gem_specs.values.each do |spec|
      name = spec.name.downcase
      if previous_gem_specs_map.has_key?(name)
        if spec.version != previous_gem_specs_map[name].version
          puts("Updated #{spec.name} #{previous_gem_specs_map[name].version.to_s} to #{spec.version.to_s}")
          update_count += 1
        end
      else
        puts("Installed #{spec.name} #{spec.version.to_s}")
        update_count += 1
      end
    end

    puts("No plugin updated") if update_count.zero?
  end

  # retrieve only the latest spec for all locally installed plugins
  # @return [Hash] result hash {plugin_name.downcase => plugin_spec}
  def find_latest_gem_specs
    LogStash::PluginManager.all_installed_plugins_gem_specs(gemfile).inject({}) do |result, spec|
      previous = result[spec.name.downcase]
      result[spec.name.downcase] = previous ? [previous, spec].max_by{|s| s.version} : spec
      result
    end
  end
end
