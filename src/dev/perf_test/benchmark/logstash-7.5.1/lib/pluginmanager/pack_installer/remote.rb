# encoding: utf-8
require "pluginmanager/pack_installer/local"
require "pluginmanager/utils/downloader"
require "fileutils"

module LogStash module PluginManager module PackInstaller
  class Remote
    attr_reader :remote_url, :feedback

    def initialize(remote_url, feedback = Utils::Downloader::ProgressbarFeedback)
      @remote_url = remote_url
      @feedback = feedback
    end

    def execute
      PluginManager.ui.info("Downloading file: #{remote_url}")
      downloaded_file = Utils::Downloader.fetch(remote_url, feedback)
      PluginManager.ui.debug("Downloaded package to: #{downloaded_file}")

      PackInstaller::Local.new(downloaded_file).execute
    ensure
      FileUtils.rm_rf(downloaded_file) if downloaded_file
    end
  end
end end end
