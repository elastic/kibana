# encoding: utf-8
require "bootstrap/environment"
require "bundler"
require "bundler/definition"
require "bundler/dependency"
require "bundler/dsl"
require "bundler/injector"
require "bundler/shared_helpers"
require "pluginmanager/gemfile"
require "rubygems/specification"
require "pathname"


# This class cannot be in the logstash namespace, because of the way the DSL
# class interact with the other libraries
module Bundler
  module SharedHelpers
    def default_bundle_dir
      Pathname.new(LogStash::Environment::LOGSTASH_HOME)
    end
  end
end

module Bundler
  class LogstashInjector < ::Bundler::Injector
    def self.inject!(new_deps, options = { :gemfile => LogStash::Environment::GEMFILE, :lockfile => LogStash::Environment::LOCKFILE })
      # Make sure all the available Specifications
      # are loaded before trying to inject any new gems
      # If we dont do this, we will have a stale index that wont have the gems
      # that we just have installed.
      ::Gem::Specification.reset

      gemfile = options.delete(:gemfile)
      lockfile = options.delete(:lockfile)

      bundler_format = new_deps.plugins.collect(&method(:dependency))
      dependencies = new_deps.dependencies.collect(&method(:dependency))

      injector = new(bundler_format)

      # Some of the internal classes requires to be inside the LOGSTASH_HOME to find the relative
      # path of the core gems.
      Dir.chdir(LogStash::Environment::LOGSTASH_HOME) do
        injector.inject(gemfile, lockfile, dependencies)
      end
    end

    def self.dependency(plugin)
      ::Bundler::Dependency.new(plugin.name, "=#{plugin.version}")
    end

    # This class is pretty similar to what bundler's injector class is doing
    # but we only accept a local resolution of the dependencies instead of calling rubygems.
    # so we removed `definition.resolve_remotely!`
    #
    # And managing the gemfile is down by using our own Gemfile parser, this allow us to
    # make it work with gems that are already defined in the gemfile.
    def inject(gemfile_path, lockfile_path, dependencies)
      Bundler.definition.ensure_equivalent_gemfile_and_lockfile(true) if Bundler.settings[:frozen]

      Bundler.settings.temporary(:frozen => false) do
        builder = Dsl.new
        gemfile = LogStash::Gemfile.new(File.new(gemfile_path, "r+")).load

        begin
          @deps.each do |dependency|
            gemfile.update(dependency.name, dependency.requirement)
          end

          # If the dependency is defined in the gemfile, lets try to update the version with the one we have
          # with the pack.
          dependencies.each do |dependency|
            if gemfile.defined_in_gemfile?(dependency.name)
              gemfile.update(dependency.name, dependency.requirement)
            end
          end

          builder.eval_gemfile("bundler file", gemfile.generate())
          definition = builder.to_definition(lockfile_path, {})
          definition.lock(lockfile_path)
          gemfile.save
        rescue => e
          # the error should be handled elsewhere but we need to get the original file if we dont
          # do this logstash will be in an inconsistent state
          gemfile.restore!
          raise e
        end
      end
    end
  end
end
