$LOAD_PATH.push(File.expand_path(File.dirname(__FILE__) + "/../../logstash-core/lib"))
require_relative "../bootstrap/environment"
LogStash::Bundler.setup!({:without => [:build, :development]})

require "logstash-core/logstash-core"
require "logstash/util/settings_helper"

java_import "org.logstash.secret.store.SecretStoreExt"
java_import "org.logstash.secret.store.SecretStoreFactory"
java_import "org.logstash.secret.SecretIdentifier"
java_import "org.logstash.secret.store.SecureConfig"
java_import "org.logstash.secret.cli.SecretStoreCli"
java_import "org.logstash.secret.cli.Terminal"

# Thin wrapper to the Java SecretStore Command Line Interface
class LogStash::SecretStoreCli
  include LogStash::Util::Loggable

  begin
    index = ARGV.find_index("--path.settings")
    # strip out any path.settings from the command line
    unless index.nil?
      path_settings_value = ARGV.slice!(index, 2)[1]
      if path_settings_value.nil?
        logger.error("''--path.settings' found, but it is empty. Please remove '--path.settings' from arguments or provide a value") if path_settings_value.nil?
        exit 1
      end
    end

    LogStash::Util::SettingsHelper.pre_process
    LogStash::Util::SettingsHelper.from_yaml(["--path.settings", path_settings_value])
    LogStash::Util::SettingsHelper.post_process
    secure_config = SecretStoreExt.getConfig(LogStash::SETTINGS.get_setting("keystore.file").value, LogStash::SETTINGS.get_setting("keystore.classname").value)
    cli = SecretStoreCli.new(Terminal.new)
    cli.command(ARGV[0], secure_config, ARGV[1])
    exit 0
  rescue => e
    logger.error(e.message, :cause => e.cause, :backtrace => e.backtrace)
    exit 1
  end

end
