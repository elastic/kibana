# encoding: utf-8
require_relative "pack_command"

class LogStash::PluginManager::Pack < LogStash::PluginManager::PackCommand
  option "--tgz", :flag, "compress package as a tar.gz file", :default => !LogStash::Environment.win_platform?
  option "--zip", :flag, "compress package as a zip file", :default => LogStash::Environment.win_platform?
  option "--[no-]clean", :flag, "clean up the generated dump of plugins", :default => true
  option "--overwrite", :flag, "Overwrite a previously generated package file", :default => false

  def execute
    signal_deprecation_warning_for_pack

    puts("Packaging plugins for offline usage")

    validate_target_file
    LogStash::Bundler.invoke!({:package => true, :all => true})
    archive_manager.compress(LogStash::Environment::CACHE_PATH, target_file)
    FileUtils.rm_rf(LogStash::Environment::CACHE_PATH) if clean?

    puts("Generated at #{target_file}")
  end

  private

  def delete_target_file?
    return true if overwrite?
    puts("File #{target_file} exist, do you want to overwrite it? (Y/N)")
    ( "y" == STDIN.gets.strip.downcase ? true : false)
  end

  def validate_target_file
    if File.exist?(target_file)
      if  delete_target_file?
        File.delete(target_file)
      else
        signal_error("Package creation cancelled, a previously generated package exist at location: #{target_file}, move this file to safe place and run the command again")
      end
    end
  end

  def target_file
    target_file = File.join(LogStash::Environment::LOGSTASH_HOME, "plugins_package")
    "#{target_file}#{file_extension}"
  end
end
