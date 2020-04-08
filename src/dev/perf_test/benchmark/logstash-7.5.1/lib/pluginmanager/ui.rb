# encoding: utf-8
module LogStash module PluginManager
  # The command line commands should be able to report but they shouldn't
  # require an explicit logger like log4j.
  class Shell
    def info(message)
      puts message
    end
    alias_method :error, :info
    alias_method :warn, :info

    def debug(message)
      puts message if ENV["DEBUG"]
    end
  end

  def self.ui
    @ui ||= Shell.new
  end

  def self.ui=(new_ui)
    @ui = new_ui
  end
end end
