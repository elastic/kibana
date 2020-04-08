# encoding: utf-8

module LogStash module Inputs
  class LogCompletedFileHandler
    def initialize(log_completed_file_path)
      @log_completed_file_path = Pathname.new(log_completed_file_path)
    end

    def handle(path)
      @log_completed_file_path.open("a") { |fd| fd.puts(path) }
    end
  end
end end
