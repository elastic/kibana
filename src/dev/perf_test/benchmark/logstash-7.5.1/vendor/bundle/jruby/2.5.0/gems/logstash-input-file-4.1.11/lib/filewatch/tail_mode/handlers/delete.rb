# encoding: utf-8

module FileWatch module TailMode module Handlers
  class Delete < Base
    DATA_LOSS_WARNING = "watched file path was deleted or rotated before all content was read, if the file is found again it will be read from the last position"
    def handle_specifically(watched_file)
      # TODO consider trying to find the renamed file - it will have the same inode.
      # Needs a rotate scheme rename hint from user e.g. "<name>-YYYY-MM-DD-N.<ext>" or "<name>.<ext>.N"
      # send the found content to the same listener (stream identity)
      logger.trace("info",
        "watched_file details" => watched_file.details,
        "path" => watched_file.path)
      if watched_file.bytes_unread > 0
        logger.warn(DATA_LOSS_WARNING, "unread_bytes" => watched_file.bytes_unread, "path" => watched_file.path)
      end
      watched_file.listener.deleted
      # no need to worry about data in the buffer
      # if found it will be associated by inode and read from last position
      sincedb_collection.watched_file_deleted(watched_file)
      watched_file.file_close
    end
  end
end end end
