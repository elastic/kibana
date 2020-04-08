# encoding: utf-8

module FileWatch module TailMode module Handlers
  class Create < Base
    def handle_specifically(watched_file)
      if open_file(watched_file)
        add_or_update_sincedb_collection(watched_file) unless sincedb_collection.member?(watched_file.sincedb_key)
      end
    end

    def update_existing_specifically(watched_file, sincedb_value)
      # sincedb_value is the source of truth
      watched_file.update_bytes_read(sincedb_value.position)
    end
  end
end end end
