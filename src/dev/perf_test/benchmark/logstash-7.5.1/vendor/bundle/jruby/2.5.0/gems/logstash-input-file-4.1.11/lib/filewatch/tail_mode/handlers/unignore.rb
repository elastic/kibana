# encoding: utf-8

module FileWatch module TailMode module Handlers
  class Unignore < Base
    # a watched file can be put straight into the ignored state
    # before any other handling has been done
    # at a minimum we create or associate a sincedb value
    def handle_specifically(watched_file)
      add_or_update_sincedb_collection(watched_file)
    end

    def get_new_value_specifically(watched_file)
      # for file initially ignored their bytes_read was set to stat.size
      # use this value not the `start_new_files_at` for the position
      # logger.trace("get_new_value_specifically", "watched_file" => watched_file.inspect)
      SincedbValue.new(watched_file.bytes_read).tap do |val|
        val.set_watched_file(watched_file)
        logger.trace("-------------------- >>>>> get_new_value_specifically: unignore", "watched file" => watched_file.details, "sincedb value" => val)
      end
    end

    def update_existing_specifically(watched_file, sincedb_value)
      # when this watched_file was ignored it had it bytes_read set to eof
      # now the file has changed (watched_file.size_changed?)
      # it has been put into the watched state so when it becomes active
      # we will handle grow or shrink
      # for now we seek to where we were before the file got ignored (grow)
      # or to the start (shrink)
      logger.trace("-------------------- >>>>> update_existing_specifically: unignore", "watched file" => watched_file.details, "sincedb value" => sincedb_value)
      position = 0
      if watched_file.shrunk?
        watched_file.update_bytes_read(0)
      else
        position = watched_file.bytes_read
      end
      sincedb_value.update_position(position)
    end
  end
end end end
