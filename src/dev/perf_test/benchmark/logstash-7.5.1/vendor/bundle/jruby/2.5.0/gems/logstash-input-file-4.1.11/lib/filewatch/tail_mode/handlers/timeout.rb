# encoding: utf-8

module FileWatch module TailMode module Handlers
  class Timeout < Base
    def handle_specifically(watched_file)
      watched_file.listener.timed_out
      watched_file.file_close
    end
  end
end end end
