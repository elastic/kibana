# encoding: utf-8

require "fileutils"

module LogStash
  module Bundler
    extend self

    def patch!
      # Patch to prevent Bundler to save a .bundle/config file in the root
      # of the application
      ::Bundler::Settings.module_exec do
        def set_local(key, value)
          set_key(key, value, @local_config, nil)
        end
      end

      # In recent versions (currently 1.17.3) Bundler calls reset_paths! early during
      # Bundler::CLI.start (https://github.com/bundler/bundler/blob/v1.17.3/lib/bundler/cli.rb#L39)
      # This breaks our setting up of gemfile and bundle paths, the without group setting etc
      # We need to tone down this very aggressive resetter (https://github.com/bundler/bundler/blob/v1.17.3/lib/bundler.rb#L487-L500)
      # So we reimplement it here to only nullify the definition object, so that it can be computed
      # again if necessary with all the configuration in place.
      ::Bundler.module_exec do
        def self.reset_paths!
          @definition = nil
        end
      end

      # This patch makes rubygems fetch directly from the remote servers
      # the dependencies he need and might not have downloaded in a local
      # repository. This basically enabled the offline feature to work as
      # we remove the gems from the vendor directory before packaging.
      ::Bundler::Source::Rubygems.module_exec do
        def cached_gem(spec)
          cached_built_in_gem(spec)
        end
      end
    end

    def setup!(options = {})
      options = {:without => [:development]}.merge(options)
      options[:without] = Array(options[:without])

      ::Gem.clear_paths
      ENV['GEM_HOME'] = ENV['GEM_PATH'] = Environment.logstash_gem_home
      ::Gem.paths = ENV

      # set BUNDLE_GEMFILE ENV before requiring bundler to avoid bundler recurse and load unrelated Gemfile(s)
      ENV["BUNDLE_GEMFILE"] = Environment::GEMFILE_PATH

      require "bundler"
      LogStash::Bundler.patch!

      ::Bundler.settings.set_local(:path, Environment::BUNDLE_DIR)
      ::Bundler.settings.set_local(:without, options[:without])
      # in the context of Bundler.setup it looks like this is useless here because Gemfile path can only be specified using
      # the ENV, see https://github.com/bundler/bundler/blob/v1.8.3/lib/bundler/shared_helpers.rb#L103
      ::Bundler.settings.set_local(:gemfile, Environment::GEMFILE_PATH)

      ::Bundler.reset!
      ::Bundler.setup
    end

    # execute bundle install and capture any $stdout output. any raised exception in the process will be trapped
    # and returned. logs errors to $stdout.
    # @param [Hash] options invoke options with default values, :max_tries => 10, :clean => false, :install => false, :update => false
    # @option options [Boolean] :max_tries The number of times bundler is going to try the installation before failing (default: 10)
    # @option options [Boolean] :clean It cleans the unused gems (default: false)
    # @option options [Boolean] :install Run the installation of a set of gems defined in a Gemfile (default: false)
    # @option options [Boolean, String, Array] :update Update the current environment, must be either false or a String or an Array of String (default: false)
    # @option options [Boolean] :local Do not attempt to fetch gems remotely and use the gem cache instead (default: false)
    # @option options [Boolean] :package Locks and then caches all dependencies to be reused later on (default: false)
    # @option options [Boolean] :all It packages dependencies defined with :git or :path (default: false)
    # @option options [Array] :without  Exclude gems that are part of the specified named group (default: [:development])
    # @return [String, Exception] the installation captured output and any raised exception or nil if none
    def invoke!(options = {})
      options = {:max_tries => 10, :clean => false, :install => false, :update => false, :local => false,
                 :jobs => 12, :all => false, :package => false, :without => [:development]}.merge(options)
      options[:without] = Array(options[:without])
      options[:update] = Array(options[:update]) if options[:update]

      ::Gem.clear_paths
      ENV['GEM_HOME'] = ENV['GEM_PATH'] = LogStash::Environment.logstash_gem_home
      ::Gem.paths = ENV
      # set BUNDLE_GEMFILE ENV before requiring bundler to avoid bundler recurse and load unrelated Gemfile(s).
      # in the context of calling Bundler::CLI this is not really required since Bundler::CLI will look at
      # Bundler.settings[:gemfile] unlike Bundler.setup. For the sake of consistency and defensive/future proofing, let's keep it here.
      ENV["BUNDLE_GEMFILE"] = LogStash::Environment::GEMFILE_PATH

      require "bundler"
      require "bundler/cli"

      # create Gemfile from template iff it does not exist
      unless ::File.exists?(Environment::GEMFILE_PATH)
        FileUtils.copy(
          ::File.join(Environment::LOGSTASH_HOME, "Gemfile.template"), Environment::GEMFILE_PATH
        )
      end
      # create Gemfile.jruby-1.9.lock from template iff a template exists it itself does not exist
      lock_template = ::File.join(ENV["LOGSTASH_HOME"], "Gemfile.jruby-2.5.lock.release")
      if ::File.exists?(lock_template) && !::File.exists?(Environment::LOCKFILE)
        FileUtils.copy(lock_template, Environment::LOCKFILE)
      end

      LogStash::Bundler.patch!

      # force Rubygems sources to our Gemfile sources
      ::Gem.sources = ::Gem::SourceList.from(options[:rubygems_source]) if options[:rubygems_source]

      ::Bundler.settings.set_local(:path, LogStash::Environment::BUNDLE_DIR)
      ::Bundler.settings.set_local(:gemfile, LogStash::Environment::GEMFILE_PATH)
      ::Bundler.settings.set_local(:without, options[:without])
      ::Bundler.settings.set_local(:force, options[:force])

      if !debug?
        # Will deal with transient network errors
        execute_bundler_with_retry(options)
      else
        options[:verbose] = true
        execute_bundler(options)
      end
    end

    def execute_bundler_with_retry(options)
      try = 0
      # capture_stdout also traps any raised exception and pass them back as the function return [output, exception]
      output, exception = capture_stdout do
        loop do
          begin
            execute_bundler(options)
            break
          rescue ::Bundler::VersionConflict => e
            $stderr.puts("Plugin version conflict, aborting")
            raise(e)
          rescue ::Bundler::GemNotFound => e
            $stderr.puts("Plugin not found, aborting")
            raise(e)
          rescue => e
            if try >= options[:max_tries]
              $stderr.puts("Too many retries, aborting, caused by #{e.class}")
              $stderr.puts(e.message) if ENV["DEBUG"]
              raise(e)
            end

            try += 1
            $stderr.puts("Error #{e.class}, retrying #{try}/#{options[:max_tries]}")
            $stderr.puts(e.message)
            sleep(0.5)
          end
        end
      end
      raise exception if exception

      return output
    end

    def execute_bundler(options)
      ::Bundler.reset!
      ::Bundler::CLI.start(bundler_arguments(options))
    end

    def debug?
      ENV["DEBUG"]
    end

    # build Bundler::CLI.start arguments array from the given options hash
    # @param option [Hash] the invoke! options hash
    # @return [Array<String>] Bundler::CLI.start string arguments array
    def bundler_arguments(options = {})
      arguments = []

      if options[:install]
        arguments << "install"
        arguments << "--clean" if options[:clean]
        if options[:local]
          arguments << "--local"
          arguments << "--no-prune" # From bundler docs: Don't remove stale gems from the cache.
        end
      elsif options[:update]
        arguments << "update"
        arguments << options[:update]
        arguments << "--local" if options[:local]
      elsif options[:clean]
        arguments << "clean"
      elsif options[:package]
        arguments << "package"
        arguments << "--all" if options[:all]
      end

      arguments << "--verbose" if options[:verbose]

      arguments.flatten
    end

   # capture any $stdout from the passed block. also trap any exception in that block, in which case the trapped exception will be returned
    # @param [Proc] the code block to execute
    # @return [String, Exception] the captured $stdout string and any trapped exception or nil if none
    def capture_stdout(&block)
      old_stdout = $stdout
      $stdout = StringIO.new("", "w")
      begin
        block.call
      rescue => e
        return [$stdout.string, e]
      end

      [$stdout.string, nil]
    ensure
      $stdout = old_stdout
    end

  end
end
