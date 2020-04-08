require "logstash/settings"
require "logstash-core/logstash-core"
require "logstash/environment"

##########################
# Settings have an implicit initialization life-cycle, this helper exists to aid with the reading the settings.
#
# Defaults are read from "logstash/environment"
# SettingsHelper.pre_process - registers defaults unavailable from "logstash/environment"
# SettingsHelper.from_yaml - finds yaml based on "--path.settings" and updates defaults if needed.
# SettingsHelper.post_process - callback to re-calculate derived settings
#
# The methods should be called in the above order before the settings are ready to be used.
########################
module LogStash::Util::SettingsHelper

  # The `path.settings` and `path.logs` can not be defined in "logstash/environment" since the `Environment::LOGSTASH_HOME` doesn't
  # exist unless launched via "bootstrap/environment"
  def self.pre_process
    LogStash::SETTINGS.register(LogStash::Setting::String.new("path.settings", ::File.join(LogStash::Environment::LOGSTASH_HOME, "config")))
    LogStash::SETTINGS.register(LogStash::Setting::String.new("path.logs", ::File.join(LogStash::Environment::LOGSTASH_HOME, "logs")))
  end

  # Ensure that any settings are re-calculated after loading yaml
  def self.post_process
    LogStash::SETTINGS.post_process
  end

  # param args: The array of all the command line arguments. Used to find the "path.settings" to read the settings yaml.
  # Return true if successful, false otherwise
  def self.from_yaml(args)
    settings_path = fetch_settings_path(args)

    LogStash::SETTINGS.set("path.settings", settings_path) if settings_path
    LogStash::SETTINGS.set("keystore.file", ::File.join(settings_path, "logstash.keystore")) if settings_path

    begin
      LogStash::SETTINGS.from_yaml(LogStash::SETTINGS.get("path.settings"))
    rescue Errno::ENOENT
      $stderr.puts "WARNING: Could not find logstash.yml which is typically located in $LS_HOME/config or /etc/logstash. You can specify the path using --path.settings. Continuing using the defaults"
    rescue => e
      # abort unless we're just looking for the help
      unless cli_help?(args)
        if e.kind_of?(Psych::Exception)
          yaml_file_path = ::File.join(LogStash::SETTINGS.get("path.settings"), "logstash.yml")
          $stderr.puts "ERROR: Failed to parse YAML file \"#{yaml_file_path}\". Please confirm if the YAML structure is valid (e.g. look for incorrect usage of whitespace or indentation). Aborting... parser_error=>#{e.message}"
        else
          $stderr.puts "ERROR: Failed to load settings file from \"path.settings\". Aborting... path.setting=#{LogStash::SETTINGS.get("path.settings")}, exception=#{e.class}, message=>#{e.message}"
        end
        return false
      end
    end
    return true
  end

  # where can I find the logstash.yml file?
  # 1. look for a "--path.settings path"
  # 2. look for a "--path.settings=path"
  # 3. check if the LS_SETTINGS_DIR environment variable is set
  # 4. return nil if not found
  def self.fetch_settings_path(cli_args)
    if i=cli_args.find_index("--path.settings")
      cli_args[i+1]
    elsif settings_arg = cli_args.find {|v| v.match(/--path.settings=/)}
      match = settings_arg.match(/--path.settings=(.*)/)
      match[1]
    elsif ENV['LS_SETTINGS_DIR']
      ENV['LS_SETTINGS_DIR']
    else
      nil
    end
  end

  # is the user asking for CLI help subcommand?
  def self.cli_help?(args)
    # I know, double negative
    !(["--help", "-h"] & args).empty?
  end

end