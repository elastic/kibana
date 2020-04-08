# encoding: utf-8

module LogStash module Inputs
  class DeleteCompletedFileHandler
    def handle(path)
      Pathname.new(path).unlink rescue nil
    end
  end
end end
