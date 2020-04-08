# encoding: utf-8
require_relative "pack_command"

class LogStash::PluginManager::Unpack < LogStash::PluginManager::PackCommand
  option "--tgz", :flag, "unpack a packaged tar.gz file", :default => !LogStash::Environment.win_platform?
  option "--zip", :flag, "unpack a packaged  zip file", :default => LogStash::Environment.win_platform?

  parameter "file", "the package file name", :attribute_name => :package_file, :required => true

  def execute
    signal_deprecation_warning_for_pack

    puts("Unpacking #{package_file}")

    FileUtils.rm_rf(LogStash::Environment::CACHE_PATH)
    validate_cache_location
    archive_manager.extract(package_file, LogStash::Environment::CACHE_PATH)
    puts("Unpacked at #{LogStash::Environment::CACHE_PATH}")
    puts("The unpacked plugins can now be installed in local-only mode using bin/logstash-plugin install --local [plugin name]")
  end

  private

  def validate_cache_location
    cache_location = LogStash::Environment::CACHE_PATH
    if File.exist?(cache_location)
      puts("Directory #{cache_location} is going to be overwritten, do you want to continue? (Y/N)")
      override = ( "y" == STDIN.gets.strip.downcase ? true : false)
      if override
        FileUtils.rm_rf(cache_location)
      else
        puts("Unpack cancelled: file #{cache_location} already exists, please delete or move it")
        exit
      end
    end
  end
end
