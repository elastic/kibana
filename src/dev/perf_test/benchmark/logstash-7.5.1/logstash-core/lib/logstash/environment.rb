# encoding: utf-8
require "logstash-core/logstash-core"
require "logstash/config/cpu_core_strategy"
require "logstash/settings"
require "logstash/util/cloud_setting_id"
require "logstash/util/cloud_setting_auth"
require "logstash/util/modules_setting_array"
require "socket"
require "stud/temporary"

module LogStash
  # In the event that we're requiring this file without bootstrap/environment.rb
  if !defined?(LogStash::Environment::LOGSTASH_HOME)
    module Environment
      LOGSTASH_HOME = Stud::Temporary.directory("logstash-home")
      Dir.mkdir(::File.join(LOGSTASH_HOME, "data"))
    end
  end

  [
            Setting::String.new("node.name", Socket.gethostname),
    Setting::NullableString.new("path.config", nil, false),
 Setting::WritableDirectory.new("path.data", ::File.join(LogStash::Environment::LOGSTASH_HOME, "data")),
    Setting::NullableString.new("config.string", nil, false),
           Setting::Modules.new("modules.cli", LogStash::Util::ModulesSettingArray, []),
           Setting::Modules.new("modules", LogStash::Util::ModulesSettingArray, []),
                    Setting.new("modules_list", Array, []),
                    Setting.new("modules_variable_list", Array, []),
           Setting::Modules.new("cloud.id", LogStash::Util::CloudSettingId),
           Setting::Modules.new("cloud.auth",LogStash::Util::CloudSettingAuth),
           Setting::Boolean.new("modules_setup", false),
           Setting::Boolean.new("config.test_and_exit", false),
           Setting::Boolean.new("config.reload.automatic", false),
           Setting::TimeValue.new("config.reload.interval", "3s"), # in seconds
           Setting::Boolean.new("config.support_escapes", false),
            Setting::String.new("config.field_reference.parser", "STRICT", true, %w(STRICT)),
           Setting::Boolean.new("metric.collect", true),
            Setting::String.new("pipeline.id", "main"),
           Setting::Boolean.new("pipeline.system", false),
   Setting::PositiveInteger.new("pipeline.workers", LogStash::Config::CpuCoreStrategy.maximum),
   Setting::PositiveInteger.new("pipeline.batch.size", 125),
           Setting::Numeric.new("pipeline.batch.delay", 50), # in milliseconds
           Setting::Boolean.new("pipeline.unsafe_shutdown", false),
           Setting::Boolean.new("pipeline.java_execution", true),
           Setting::Boolean.new("pipeline.reloadable", true),
           Setting::Boolean.new("pipeline.plugin_classloaders", false),
           Setting::Boolean.new("pipeline.separate_logs", false),
                    Setting.new("path.plugins", Array, []),
    Setting::NullableString.new("interactive", nil, false),
           Setting::Boolean.new("config.debug", false),
            Setting::String.new("log.level", "info", true, ["fatal", "error", "warn", "debug", "info", "trace"]),
           Setting::Boolean.new("version", false),
           Setting::Boolean.new("help", false),
            Setting::String.new("log.format", "plain", true, ["json", "plain"]),
            Setting::String.new("http.host", "127.0.0.1"),
            Setting::PortRange.new("http.port", 9600..9700),
            Setting::String.new("http.environment", "production"),
            Setting::String.new("queue.type", "memory", true, ["persisted", "memory"]),
            Setting::Boolean.new("queue.drain", false),
            Setting::Bytes.new("queue.page_capacity", "64mb"),
            Setting::Bytes.new("queue.max_bytes", "1024mb"),
            Setting::Numeric.new("queue.max_events", 0), # 0 is unlimited
            Setting::Numeric.new("queue.checkpoint.acks", 1024), # 0 is unlimited
            Setting::Numeric.new("queue.checkpoint.writes", 1024), # 0 is unlimited
            Setting::Numeric.new("queue.checkpoint.interval", 1000), # 0 is no time-based checkpointing
            Setting::Boolean.new("queue.checkpoint.retry", false),
            Setting::Boolean.new("dead_letter_queue.enable", false),
            Setting::Bytes.new("dead_letter_queue.max_bytes", "1024mb"),
            Setting::TimeValue.new("slowlog.threshold.warn", "-1"),
            Setting::TimeValue.new("slowlog.threshold.info", "-1"),
            Setting::TimeValue.new("slowlog.threshold.debug", "-1"),
            Setting::TimeValue.new("slowlog.threshold.trace", "-1"),
            Setting::String.new("keystore.classname", "org.logstash.secret.store.backend.JavaKeyStore"),
            Setting::String.new("keystore.file", ::File.join(::File.join(LogStash::Environment::LOGSTASH_HOME, "config"), "logstash.keystore"), false) # will be populated on
  # post_process
  ].each {|setting| SETTINGS.register(setting) }



  # Compute the default queue path based on `path.data`
  default_queue_file_path = ::File.join(SETTINGS.get("path.data"), "queue")
  SETTINGS.register Setting::WritableDirectory.new("path.queue", default_queue_file_path)
  # Compute the default dead_letter_queue path based on `path.data`
  default_dlq_file_path = ::File.join(SETTINGS.get("path.data"), "dead_letter_queue")
  SETTINGS.register Setting::WritableDirectory.new("path.dead_letter_queue", default_dlq_file_path)


  SETTINGS.on_post_process do |settings|
    # If the data path is overridden but the queue path isn't recompute the queue path
    # We need to do this at this stage because of the weird execution order
    # our monkey-patched Clamp follows
    if settings.set?("path.data")
      if !settings.set?("path.queue")
        settings.set_value("path.queue", ::File.join(settings.get("path.data"), "queue"))
      end
      if !settings.set?("path.dead_letter_queue")
        settings.set_value("path.dead_letter_queue", ::File.join(settings.get("path.data"), "dead_letter_queue"))
      end
    end
  end

  module Environment
    extend self

    LOGSTASH_CORE = ::File.expand_path(::File.join(::File.dirname(__FILE__), "..", ".."))
    LOGSTASH_ENV = (ENV["LS_ENV"] || 'production').to_s.freeze

    LINUX_OS_RE = /linux/
    WINDOW_OS_RE = /mswin|msys|mingw|cygwin|bccwin|wince|emc/
    MACOS_OS_RE = /darwin/

    def env
      LOGSTASH_ENV
    end

    def production?
      env.downcase == "production"
    end

    def development?
      env.downcase == "development"
    end

    def test?
      env.downcase == "test"
    end

    def runtime_jars_root(dir_name, package)
      ::File.join(dir_name, package, "runtime-jars")
    end

    def test_jars_root(dir_name, package)
      ::File.join(dir_name, package, "test-jars")
    end

    def load_runtime_jars!(dir_name="vendor", package="jar-dependencies")
      load_jars!(::File.join(runtime_jars_root(dir_name, package), "*.jar"))
    end

    def load_test_jars!(dir_name="vendor", package="jar-dependencies")
      load_jars!(::File.join(test_jars_root(dir_name, package), "*.jar"))
    end

    def load_jars!(pattern)
      jar_files = find_jars(pattern)
      require_jars! jar_files
    end

    def find_jars(pattern)
      require 'java'
      jar_files = Dir.glob(pattern)
      raise(LogStash::EnvironmentError, I18n.t("logstash.environment.missing-jars", :pattern => pattern)) if jar_files.empty?
      jar_files
    end

    def require_jars!(files)
      files.each do |jar_file|
        loaded = require jar_file
        puts("Loaded #{jar_file}") if $DEBUG && loaded
      end
    end

    def ruby_bin
      ENV["USE_RUBY"] == "1" ? "ruby" : File.join("vendor", "jruby", "bin", "jruby")
    end

    def windows?
      host_os =~ WINDOW_OS_RE
    end

    def linux?
      host_os =~ LINUX_OS_RE
    end

    def host_os
      RbConfig::CONFIG['host_os']
    end

    def locales_path(path)
      return ::File.join(LOGSTASH_CORE, "locales", path)
    end

    def load_locale!
      require "i18n"
      I18n.enforce_available_locales = true
      I18n.load_path << LogStash::Environment.locales_path("en.yml")
      I18n.reload!
      fail "No locale? This is a bug." if I18n.available_locales.empty?
    end

    # add path for bare/ungemified plugins lookups. the path must be the base path that will include
    # the dir structure 'logstash/TYPE/NAME.rb' where TYPE is 'inputs' 'filters', 'outputs' or 'codecs'
    # and NAME is the name of the plugin
    # @param path [String] plugins path to add
    def add_plugin_path(path)
      $LOAD_PATH << path
    end
  end
end

require "logstash/patches"
