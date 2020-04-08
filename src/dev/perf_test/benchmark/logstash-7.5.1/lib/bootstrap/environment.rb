# encoding: utf-8
# bootstrap.rb contains the minimal code to be able to launch Bundler to eventually be able
# to retrieve the core code in the logstash-core gem which can live under different paths
# depending on the launch context (local dev, packaged, etc)

require_relative "bundler"
require_relative "rubygems"
require "pathname"

module LogStash
  module Environment
    extend self

    # also set the env LOGSTASH_HOME
    LOGSTASH_HOME = ENV["LOGSTASH_HOME"] = ::File.expand_path(::File.join(__FILE__, "..", "..", ".."))

    BUNDLE_DIR = ::File.join(LOGSTASH_HOME, "vendor", "bundle")
    GEMFILE_PATH = ::File.join(LOGSTASH_HOME, "Gemfile")
    LOCAL_GEM_PATH = ::File.join(LOGSTASH_HOME, 'vendor', 'local_gems')
    CACHE_PATH = ::File.join(LOGSTASH_HOME, "vendor", "cache")
    LOCKFILE = Pathname.new(::File.join(LOGSTASH_HOME, "Gemfile.lock"))
    GEMFILE = Pathname.new(::File.join(LOGSTASH_HOME, "Gemfile"))

    # @return [String] the ruby version string bundler uses to craft its gem path
    def gem_ruby_version
      RbConfig::CONFIG["ruby_version"]
    end

    # @return [String] major.minor ruby version, ex 1.9
    def ruby_abi_version
      RUBY_VERSION[/(\d+\.\d+)(\.\d+)*/, 1]
    end

    # @return [String] jruby, ruby, rbx, ...
    def ruby_engine
      RUBY_ENGINE
    end

    def oss_only?
      return true if ENV['OSS']=="true"

      !File.exists?(File.join(LogStash::Environment::LOGSTASH_HOME, "x-pack"))
    end

    def win_platform?
      ::Gem.win_platform?
    end

    def logstash_gem_home
      ::File.join(BUNDLE_DIR, ruby_engine, gem_ruby_version)
    end

    def vendor_path(path)
      return ::File.join(LOGSTASH_HOME, "vendor", path)
    end

    def pattern_path(path)
      return ::File.join(LOGSTASH_HOME, "patterns", path)
    end

  end
end

# when launched as a script, not require'd, (currently from bin/logstash and bin/logstash-plugin) the first
# argument is the path of a Ruby file to require and a LogStash::Runner class is expected to be
# defined and exposing the LogStash::Runner#main instance method which will be called with the current ARGV
# currently lib/logstash/runner.rb and lib/pluginmanager/main.rb are called using this.
if $0 == __FILE__
  LogStash::Bundler.setup!({:without => [:build, :development]})
  require_relative "patches/jar_dependencies"

  require ARGV.shift
  exit_status = LogStash::Runner.run("bin/logstash", ARGV)
  exit(exit_status || 0)
end
