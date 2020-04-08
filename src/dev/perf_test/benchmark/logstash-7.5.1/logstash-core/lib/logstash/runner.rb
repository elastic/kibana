# encoding: utf-8
Thread.abort_on_exception = true
Encoding.default_external = Encoding::UTF_8
$DEBUGLIST = (ENV["DEBUG"] || "").split(",")

require 'pathname'
LogStash::ROOT = Pathname.new(File.join(File.expand_path(File.dirname(__FILE__)), "..", "..", "..")).cleanpath.to_s
LogStash::XPACK_PATH = File.join(LogStash::ROOT, "x-pack")
LogStash::OSS = ENV["OSS"] == "true" || !File.exists?(LogStash::XPACK_PATH)

if !LogStash::OSS
  xpack_dir = File.join(LogStash::XPACK_PATH, "lib")
  unless $LOAD_PATH.include?(xpack_dir)
    $LOAD_PATH.unshift(xpack_dir)
  end
end

require "clamp"
require "net/http"

require "logstash-core/logstash-core"
require "logstash/environment"
require "logstash/modules/cli_parser"
require "logstash/util/settings_helper"

LogStash::Environment.load_locale!

require "logstash/agent"
require "logstash/config/defaults"
require "logstash/patches/clamp"
require "logstash/settings"
require "logstash/version"
require 'logstash/plugins'
require "logstash/modules/util"
require "logstash/bootstrap_check/default_config"
require "logstash/bootstrap_check/persisted_queue_config"
require "set"

java_import 'org.logstash.FileLockFactory'

class LogStash::Runner < Clamp::StrictCommand
  include LogStash::Util::Loggable

  LogStash::Util::SettingsHelper.pre_process

  # Ordered list of check to run before starting logstash
  # theses checks can be changed by a plugin loaded into memory.
  DEFAULT_BOOTSTRAP_CHECKS = [
      LogStash::BootstrapCheck::DefaultConfig,
      LogStash::BootstrapCheck::PersistedQueueConfig
  ]

  # Node Settings
  option ["-n", "--node.name"], "NAME",
    I18n.t("logstash.runner.flag.name"),
    :attribute_name => "node.name",
    :default => LogStash::SETTINGS.get_default("node.name")

  # Config Settings
  option ["-f", "--path.config"], "CONFIG_PATH",
    I18n.t("logstash.runner.flag.config"),
    :attribute_name => "path.config"

  option ["-e", "--config.string"], "CONFIG_STRING",
    I18n.t("logstash.runner.flag.config-string",
      :default_input => LogStash::Config::Defaults.input,
      :default_output => LogStash::Config::Defaults.output),
    :default => LogStash::SETTINGS.get_default("config.string"),
    :attribute_name => "config.string"

  option ["--field-reference-parser"], "MODE",
         I18n.t("logstash.runner.flag.field-reference-parser"),
         :attribute_name => "config.field_reference.parser",
         :default => LogStash::SETTINGS.get_default("config.field_reference.parser")

  # Module settings
  option ["--modules"], "MODULES",
    I18n.t("logstash.runner.flag.modules"),
    :multivalued => true,
    :attribute_name => "modules_list"

  option ["-M", "--modules.variable"], "MODULES_VARIABLE",
    I18n.t("logstash.runner.flag.modules_variable"),
    :multivalued => true,
    :attribute_name => "modules_variable_list"

  option ["--setup"], :flag,
    I18n.t("logstash.runner.flag.modules_setup"),
    :default => LogStash::SETTINGS.get_default("modules_setup"),
    :attribute_name => "modules_setup"

  option ["--cloud.id"], "CLOUD_ID",
    I18n.t("logstash.runner.flag.cloud_id"),
    :attribute_name => "cloud.id"

  option ["--cloud.auth"], "CLOUD_AUTH",
    I18n.t("logstash.runner.flag.cloud_auth"),
    :attribute_name => "cloud.auth"

  # Pipeline settings
  option ["--pipeline.id"], "ID",
    I18n.t("logstash.runner.flag.pipeline-id"),
    :attribute_name => "pipeline.id",
    :default => LogStash::SETTINGS.get_default("pipeline.id")

  option ["-w", "--pipeline.workers"], "COUNT",
    I18n.t("logstash.runner.flag.pipeline-workers"),
    :attribute_name => "pipeline.workers",
    :default => LogStash::SETTINGS.get_default("pipeline.workers")

  option ["--java-execution"], :flag,
         I18n.t("logstash.runner.flag.java-execution"),
         :attribute_name => "pipeline.java_execution",
         :default => LogStash::SETTINGS.get_default("pipeline.java_execution")

  option ["--plugin-classloaders"], :flag,
         I18n.t("logstash.runner.flag.plugin-classloaders"),
         :attribute_name => "pipeline.plugin_classloaders",
         :default => LogStash::SETTINGS.get_default("pipeline.plugin_classloaders")

  option ["-b", "--pipeline.batch.size"], "SIZE",
    I18n.t("logstash.runner.flag.pipeline-batch-size"),
    :attribute_name => "pipeline.batch.size",
    :default => LogStash::SETTINGS.get_default("pipeline.batch.size")

  option ["-u", "--pipeline.batch.delay"], "DELAY_IN_MS",
    I18n.t("logstash.runner.flag.pipeline-batch-delay"),
    :attribute_name => "pipeline.batch.delay",
    :default => LogStash::SETTINGS.get_default("pipeline.batch.delay")

  option ["--pipeline.unsafe_shutdown"], :flag,
    I18n.t("logstash.runner.flag.unsafe_shutdown"),
    :attribute_name => "pipeline.unsafe_shutdown",
    :default => LogStash::SETTINGS.get_default("pipeline.unsafe_shutdown")

  # Data Path Setting
  option ["--path.data"] , "PATH",
    I18n.t("logstash.runner.flag.datapath"),
    :attribute_name => "path.data",
    :default => LogStash::SETTINGS.get_default("path.data")

  # Plugins Settings
  option ["-p", "--path.plugins"] , "PATH",
    I18n.t("logstash.runner.flag.pluginpath"),
    :multivalued => true, :attribute_name => "path.plugins",
    :default => LogStash::SETTINGS.get_default("path.plugins")

  # Logging Settings
  option ["-l", "--path.logs"], "PATH",
    I18n.t("logstash.runner.flag.log"),
    :attribute_name => "path.logs",
    :default => LogStash::SETTINGS.get_default("path.logs")

  option "--log.level", "LEVEL", I18n.t("logstash.runner.flag.log_level"),
    :default => LogStash::SETTINGS.get_default("log.level"),
    :attribute_name => "log.level"

  option "--config.debug", :flag,
    I18n.t("logstash.runner.flag.config_debug"),
    :default => LogStash::SETTINGS.get_default("config.debug"),
    :attribute_name => "config.debug"

  # Other settings
  option ["-i", "--interactive"], "SHELL",
    I18n.t("logstash.runner.flag.rubyshell"),
    :attribute_name => "interactive"

  option ["-V", "--version"], :flag,
    I18n.t("logstash.runner.flag.version")

  option ["-t", "--config.test_and_exit"], :flag,
    I18n.t("logstash.runner.flag.configtest"),
    :attribute_name => "config.test_and_exit",
    :default => LogStash::SETTINGS.get_default("config.test_and_exit")

  option ["-r", "--config.reload.automatic"], :flag,
    I18n.t("logstash.runner.flag.auto_reload"),
    :attribute_name => "config.reload.automatic",
    :default => LogStash::SETTINGS.get_default("config.reload.automatic")

  option ["--config.reload.interval"], "RELOAD_INTERVAL",
    I18n.t("logstash.runner.flag.reload_interval"),
    :attribute_name => "config.reload.interval",
    :default => LogStash::SETTINGS.get_default("config.reload.interval")

  option ["--http.host"], "HTTP_HOST",
    I18n.t("logstash.runner.flag.http_host"),
    :attribute_name => "http.host",
    :default => LogStash::SETTINGS.get_default("http.host")

  option ["--http.port"], "HTTP_PORT",
    I18n.t("logstash.runner.flag.http_port"),
    :attribute_name => "http.port",
    :default => LogStash::SETTINGS.get_default("http.port")

  option ["--log.format"], "FORMAT",
    I18n.t("logstash.runner.flag.log_format"),
    :attribute_name => "log.format",
    :default => LogStash::SETTINGS.get_default("log.format")

  option ["--path.settings"], "SETTINGS_DIR",
    I18n.t("logstash.runner.flag.path_settings"),
    :attribute_name => "path.settings",
    :default => LogStash::SETTINGS.get_default("path.settings")

  ### DEPRECATED FLAGS ###
  deprecated_option ["--verbose"], :flag,
    I18n.t("logstash.runner.flag.verbose"),
    :new_flag => "log.level", :new_value => "info"

  deprecated_option ["--debug"], :flag,
    I18n.t("logstash.runner.flag.debug"),
    :new_flag => "log.level", :new_value => "debug"

  deprecated_option ["--quiet"], :flag,
    I18n.t("logstash.runner.flag.quiet"),
    :new_flag => "log.level", :new_value => "error"

  # We configure the registry and load any plugin that can register hooks
  # with logstash, this needs to be done before any operation.
  SYSTEM_SETTINGS = LogStash::SETTINGS.clone
  LogStash::PLUGIN_REGISTRY.setup!

  attr_reader :agent, :settings, :source_loader
  attr_accessor :bootstrap_checks

  def initialize(*args)
    @settings = LogStash::SETTINGS
    @bootstrap_checks = DEFAULT_BOOTSTRAP_CHECKS.dup

    # Default we check local sources: `-e`, `-f` and the logstash.yml options.
    @source_loader = LogStash::Config::SourceLoader.new(@settings)
    @source_loader.add_source(LogStash::Config::Source::Local.new(@settings))
    @source_loader.add_source(LogStash::Config::Source::Modules.new(@settings))
    @source_loader.add_source(LogStash::Config::Source::MultiLocal.new(@settings))

    super(*args)
  end

  def run(args)
    return 1 unless LogStash::Util::SettingsHelper.from_yaml(args)
    super(*[args])
  end

  def execute
    LogStash::Util::SettingsHelper.post_process

    require "logstash/util"
    require "logstash/util/java_version"
    require "stud/task"

    # Configure Logstash logging facility, this need to be done before everything else to
    # make sure the logger has the correct settings and the log level is correctly defined.
    java.lang.System.setProperty("ls.logs", setting("path.logs"))
    java.lang.System.setProperty("ls.log.format", setting("log.format"))
    java.lang.System.setProperty("ls.log.level", setting("log.level"))
    java.lang.System.setProperty("ls.pipeline.separate_logs", setting("pipeline.separate_logs").to_s)
    unless java.lang.System.getProperty("log4j.configurationFile")
      log4j_config_location = ::File.join(setting("path.settings"), "log4j2.properties")

      # Windows safe way to produce a file: URI.
      file_schema = "file://" + (LogStash::Environment.windows? ? "/" : "")
      LogStash::Logging::Logger::reconfigure(URI.encode(file_schema + File.absolute_path(log4j_config_location)))
    end
    # override log level that may have been introduced from a custom log4j config file
    LogStash::Logging::Logger::configure_logging(setting("log.level"))

    if setting("config.debug") && !logger.debug?
      logger.warn("--config.debug was specified, but log.level was not set to \'debug\'! No config info will be logged.")
    end

    # Skip any validation and just return the version
    if version?
      show_version
      return 0
    end

    # Add local modules to the registry before everything else
    LogStash::Modules::Util.register_local_modules(LogStash::Environment::LOGSTASH_HOME)

    @dispatcher = LogStash::EventDispatcher.new(self)
    LogStash::PLUGIN_REGISTRY.hooks.register_emitter(self.class, @dispatcher)

    @settings.validate_all
    @dispatcher.fire(:before_bootstrap_checks)

    return start_shell(setting("interactive"), binding) if setting("interactive")

    module_parser = LogStash::Modules::CLIParser.new(setting("modules_list"), setting("modules_variable_list"))
    # Now populate Setting for modules.list with our parsed array.
    @settings.set("modules.cli", module_parser.output)

    begin
      @bootstrap_checks.each { |bootstrap| bootstrap.check(@settings) }
    rescue LogStash::BootstrapCheckError => e
      signal_usage_error(e.message)
      return 1
    end
    @dispatcher.fire(:after_bootstrap_checks)

    LogStash::Util::set_thread_name(self.class.name)

    LogStash::ShutdownWatcher.unsafe_shutdown = setting("pipeline.unsafe_shutdown")

    configure_plugin_paths(setting("path.plugins"))


    @settings.format_settings.each {|line| logger.debug(line) }

    # Check for absence of any configuration
    # not bulletproof because we don't know yet if there
    # are no pipelines from pipelines.yml
    sources_without_conflict = []
    unmatched_sources_conflict_messages = []
    @source_loader.sources do |source|
      if source.config_conflict?
        if source.conflict_messages.any?
          unmatched_sources_conflict_messages << source.conflict_messages.join(", ")
        end
      else
        sources_without_conflict << source
      end
    end
    if unmatched_sources_conflict_messages.any?
      # i18n should be done at the sources side
      signal_usage_error(unmatched_sources_conflict_messages.join(" "))
      return 1
    elsif sources_without_conflict.empty?
      signal_usage_error(I18n.t("logstash.runner.missing-configuration"))
      return 1
    end

    if setting("config.test_and_exit")
      begin
        results = @source_loader.fetch

        # TODO(ph): make it better for multiple pipeline
        if results.success?
          results.response.each do |pipeline_config|
            pipeline_class = pipeline_config.settings.get_value("pipeline.java_execution") ? LogStash::JavaPipeline : LogStash::BasePipeline
            pipeline_class.new(pipeline_config)
          end
          puts "Configuration OK"
          logger.info "Using config.test_and_exit mode. Config Validation Result: OK. Exiting Logstash"
        else
          raise "Could not load the configuration file"
        end
        return 0
      rescue => e
        logger.fatal I18n.t("logstash.runner.invalid-configuration", :error => e.message)
        return 1
      end
    end

    # lock path.data before starting the agent
    @data_path_lock = FileLockFactory.obtainLock(java.nio.file.Paths.get(setting("path.data")).to_absolute_path, ".lock")

    logger.info("Starting Logstash", "logstash.version" => LOGSTASH_VERSION)

    @dispatcher.fire(:before_agent)
    @agent = create_agent(@settings, @source_loader)
    @dispatcher.fire(:after_agent)

    # enable sigint/sigterm before starting the agent
    # to properly handle a stalled agent
    sigint_id = trap_sigint()
    sigterm_id = trap_sigterm()

    @agent_task = Stud::Task.new { @agent.execute }

    # no point in enabling config reloading before the agent starts
    # also windows doesn't have SIGHUP. we can skip it
    sighup_id = LogStash::Environment.windows? ? nil : trap_sighup()

    agent_return = @agent_task.wait

    @agent.shutdown

    logger.info("Logstash shut down.")

    # flush any outstanding log messages during shutdown
    org.apache.logging.log4j.LogManager.shutdown

    agent_return

  rescue org.logstash.LockException => e
    logger.fatal(I18n.t("logstash.runner.locked-data-path", :path => setting("path.data")))
    return 1
  rescue Clamp::UsageError => e
    $stderr.puts "ERROR: #{e.message}"
    show_short_help
    return 1
  rescue => e
    # if logger itself is not initialized
    if LogStash::Logging::Logger.get_logging_context.nil?
      $stderr.puts "#{I18n.t("oops")} :error => #{e}, :backtrace => #{e.backtrace}"
    else
      logger.fatal(I18n.t("oops"), :error => e, :backtrace => e.backtrace)
    end
    return 1
  ensure
    Stud::untrap("INT", sigint_id) unless sigint_id.nil?
    Stud::untrap("TERM", sigterm_id) unless sigterm_id.nil?
    Stud::untrap("HUP", sighup_id) unless sighup_id.nil?
    FileLockFactory.releaseLock(@data_path_lock) if @data_path_lock
    @log_fd.close if @log_fd
  end # def self.main

  def show_version
    show_version_logstash

    if logger.info?
      show_version_ruby
      show_version_java
      show_gems if logger.debug?
    end
  end # def show_version

  def show_version_logstash
    puts "logstash #{LOGSTASH_VERSION}"
  end # def show_version_logstash

  def show_version_ruby
    puts RUBY_DESCRIPTION
  end # def show_version_ruby

  def show_version_java
    properties = java.lang.System.getProperties
    puts "java #{properties["java.version"]} (#{properties["java.vendor"]})"
    puts "jvm #{properties["java.vm.name"]} / #{properties["java.vm.version"]}"
  end # def show_version_java

  def show_gems
    require "rubygems"
    Gem::Specification.each do |spec|
      puts "gem #{spec.name} #{spec.version}"
    end
  end # def show_gems

  # add the given paths for ungemified/bare plugins lookups
  # @param paths [String, Array<String>] plugins path string or list of path strings to add
  def configure_plugin_paths(paths)
    Array(paths).each do |path|
      fail(I18n.t("logstash.runner.configuration.plugin_path_missing", :path => path)) unless File.directory?(path)
      LogStash::Environment.add_plugin_path(path)
    end
  end

  def create_agent(*args)
    LogStash::Agent.new(*args)
  end

  # Emit a failure message and abort.
  def fail(message)
    signal_usage_error(message)
  end # def fail

  def show_short_help
    puts I18n.t("logstash.runner.short-help")
  end

  def start_shell(shell, start_binding)
    case shell
    when "pry"
      require 'pry'
      start_binding.pry
    when "irb"
      require 'irb'
      ARGV.clear
      # TODO: set binding to this instance of Runner
      # currently bugged as per https://github.com/jruby/jruby/issues/384
      IRB.start(__FILE__)
    else
      fail(I18n.t("logstash.runner.invalid-shell"))
    end
  end

  def trap_sighup
    Stud::trap("HUP") do
      logger.warn(I18n.t("logstash.agent.sighup"))
      @agent.converge_state_and_update
    end
  end

  def trap_sigterm
    Stud::trap("TERM") do
      logger.warn(I18n.t("logstash.agent.sigterm"))
      @agent_task.stop!
    end
  end

  def trap_sigint
    Stud::trap("INT") do
      if @interrupted_once
        logger.fatal(I18n.t("logstash.agent.forced_sigint"))
        # calling just Kernel.exit only raises SystemExit exception
        # and doesn't guarantee the process will terminate
        # We must call Kernel.exit! so java.lang.System.exit is called
        exit!(1)
      else
        logger.warn(I18n.t("logstash.agent.sigint"))
        Thread.new(logger) {|lg| sleep 5; lg.warn(I18n.t("logstash.agent.slow_shutdown")) }
        @interrupted_once = true
        @agent_task.stop!
      end
    end
  end

  def setting(key)
    @settings.get_value(key)
  end

end
