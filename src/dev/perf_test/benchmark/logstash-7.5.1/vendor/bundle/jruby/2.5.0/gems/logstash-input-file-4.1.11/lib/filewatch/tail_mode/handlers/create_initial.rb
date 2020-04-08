# encoding: utf-8

module FileWatch module TailMode module Handlers
  class CreateInitial < Base
    def handle_specifically(watched_file)
      if open_file(watched_file)
        logger.trace("handle_specifically opened file handle: #{watched_file.file.fileno}, path: #{watched_file.filename}")
        add_or_update_sincedb_collection(watched_file)
      end
    end

    def update_existing_specifically(watched_file, sincedb_value)
      position = watched_file.last_stat_size
      if @settings.start_new_files_at == :beginning
        position = 0
      end
      logger.trace("update_existing_specifically - #{watched_file.path}: seeking to #{position}")
      watched_file.update_bytes_read(position)
      sincedb_value.update_position(position)
    end
  end
end end end
