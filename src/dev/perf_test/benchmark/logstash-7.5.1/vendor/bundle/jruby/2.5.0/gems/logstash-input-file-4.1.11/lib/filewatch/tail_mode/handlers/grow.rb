# encoding: utf-8

module FileWatch module TailMode module Handlers
  class Grow < Base
    def handle_specifically(watched_file)
      watched_file.file_seek(watched_file.bytes_read)
      loop do
        break if quit?
        loop_control = watched_file.loop_control_adjusted_for_stat_size
        controlled_read(watched_file, loop_control)
        break unless loop_control.keep_looping?
      end
    end
  end
end end end
