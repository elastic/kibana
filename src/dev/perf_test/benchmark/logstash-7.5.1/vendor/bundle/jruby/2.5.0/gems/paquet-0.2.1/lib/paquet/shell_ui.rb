# encoding: utf-8
module Paquet
  class SilentUI
    class << self
      def debug(message)
      end
      def info(message)
      end
    end
  end

  class ShellUi
    def debug(message)
      report_message(:debug, message) if debug?
    end

    def info(message)
      report_message(:info, message)
    end

    def report_message(level, message)
      puts "[#{level.upcase}]: #{message}"
    end

    def debug?
      ENV["DEBUG"]
    end
  end

  def self.ui
    @logger ||= ShellUi.new
  end

  def self.ui=(new_output)
    @logger = new_output
  end
end
