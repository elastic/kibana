# encoding: utf-8

module FileWatch module TailMode module Handlers
  class Shrink < Base
    def handle_specifically(watched_file)
      add_or_update_sincedb_collection(watched_file)
      watched_file.file_seek(watched_file.bytes_read)
      loop do
        break if quit?
        loop_control = watched_file.loop_control_adjusted_for_stat_size
        controlled_read(watched_file, loop_control)
        break unless loop_control.keep_looping?
      end
    end

    def update_existing_specifically(watched_file, sincedb_value)
      # we have a match but size is smaller
      # set all to zero
      watched_file.reset_bytes_unread
      sincedb_value.update_position(0)
      logger.trace("update_existing_specifically: was truncated seeking to beginning", "watched file" => watched_file.details, "sincedb value" => sincedb_value)
    end
  end
end end end
