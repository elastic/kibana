# encoding: utf-8
require "bootstrap/environment"
require "bundler"
require "bundler/definition"
require "bundler/dependency"
require "bundler/dsl"
require "bundler/injector"
require "pluginmanager/gemfile"

# This class cannot be in the logstash namespace, because of the way the DSL
# class interact with the other libraries
module Bundler
  class LogstashUninstall
    attr_reader :gemfile_path, :lockfile_path

    def initialize(gemfile_path, lockfile_path)
      @gemfile_path = gemfile_path
      @lockfile_path = lockfile_path
    end

    # To be uninstalled the candidate gems need to be standalone.
    def dependants_gems(gem_name)
      builder = Dsl.new
      builder.eval_gemfile("original gemfile", File.read(gemfile_path))
      definition = builder.to_definition(lockfile_path, {})

      definition.specs
        .select { |spec| spec.dependencies.collect(&:name).include?(gem_name) }
        .collect(&:name).sort.uniq
    end

    def uninstall!(gem_name)
      unfreeze_gemfile do

        dependencies_from = dependants_gems(gem_name)

        if dependencies_from.size > 0
          display_cant_remove_message(gem_name, dependencies_from)
          false
        else
          remove_gem(gem_name)
          true
        end
      end
    end

    def remove_gem(gem_name)
      builder = Dsl.new
      file = File.new(gemfile_path, "r+")

      gemfile = LogStash::Gemfile.new(file).load
      gemfile.remove(gem_name)
      builder.eval_gemfile("gemfile to changes", gemfile.generate)

      definition = builder.to_definition(lockfile_path, {})
      definition.lock(lockfile_path)
      gemfile.save

      LogStash::PluginManager.ui.info("Successfully removed #{gem_name}")
    ensure
      file.close if file
    end

    def display_cant_remove_message(gem_name, dependencies_from)
        message =<<-eos
Failed to remove \"#{gem_name}\" because the following plugins or libraries depend on it:

* #{dependencies_from.join("\n* ")}
        eos
        LogStash::PluginManager.ui.info(message)
    end

    def unfreeze_gemfile
      Bundler.definition.ensure_equivalent_gemfile_and_lockfile(true) if Bundler.settings[:frozen]

      Bundler.settings.temporary(:frozen => false) do
        yield
      end
    end

    def self.uninstall!(gem_name, options = { :gemfile => LogStash::Environment::GEMFILE, :lockfile => LogStash::Environment::LOCKFILE })
      gemfile_path = options[:gemfile]
      lockfile_path = options[:lockfile]
      LogstashUninstall.new(gemfile_path, lockfile_path).uninstall!(gem_name)
    end
  end
end
