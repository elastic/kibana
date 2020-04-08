# encoding: utf-8
require "bootstrap/util/compress"
require "fileutils"

class LogStash::PluginManager::PackCommand < LogStash::PluginManager::Command
  def archive_manager
    zip? ? LogStash::Util::Zip : LogStash::Util::Tar
  end

  def file_extension
    zip? ? ".zip" : ".tar.gz"
  end

  def signal_deprecation_warning_for_pack
  message =<<-EOS
The pack and the unpack command are now deprecated and will be removed in a future version of Logstash.
See the `prepare-offline-pack` to update your workflow. You can get documentation about this by running `bin/logstash-plugin prepare-offline-pack --help`
  EOS
  puts message
  end
end
