# encoding: utf-8
require "logstash/util/loggable"

module FileWatch module ReadMode module Handlers
  class Base
    include LogStash::Util::Loggable

    attr_reader :sincedb_collection

    def initialize(processor, sincedb_collection, observer, settings)
      @settings = settings
      @processor = processor
      @sincedb_collection = sincedb_collection
      @observer = observer
    end

    def quit?
      @processor.watch.quit?
    end

    def handle(watched_file)
      logger.trace("handling: #{watched_file.path}")
      unless watched_file.has_listener?
        watched_file.set_listener(@observer)
      end
      handle_specifically(watched_file)
    end

    def handle_specifically(watched_file)
      # some handlers don't need to define this method
    end

    private

    def open_file(watched_file)
      return true if watched_file.file_open?
      logger.trace("opening #{watched_file.path}")
      begin
        watched_file.open
      rescue
        # don't emit this message too often. if a file that we can't
        # read is changing a lot, we'll try to open it more often, and spam the logs.
        now = Time.now.to_i
        logger.trace("opening OPEN_WARN_INTERVAL is '#{OPEN_WARN_INTERVAL}'")
        if watched_file.last_open_warning_at.nil? || now - watched_file.last_open_warning_at > OPEN_WARN_INTERVAL
          logger.warn("failed to open #{watched_file.path}: #{$!.inspect}, #{$!.backtrace.take(3)}")
          watched_file.last_open_warning_at = now
        else
          logger.trace("suppressed warning for `failed to open` #{watched_file.path}: #{$!.inspect}")
        end
        watched_file.watch # set it back to watch so we can try it again
      end
      if watched_file.file_open?
        watched_file.listener.opened
        true
      else
        false
      end
    end

    def add_or_update_sincedb_collection(watched_file)
      sincedb_value = @sincedb_collection.find(watched_file)
      if sincedb_value.nil?
        add_new_value_sincedb_collection(watched_file)
      elsif sincedb_value.watched_file == watched_file
        update_existing_sincedb_collection_value(watched_file, sincedb_value)
      else
        msg = "add_or_update_sincedb_collection: the found sincedb_value has a watched_file - this is a rename, switching inode to this watched file"
        logger.trace(msg)
        existing_watched_file = sincedb_value.watched_file
        if existing_watched_file.nil?
          sincedb_value.set_watched_file(watched_file)
          logger.trace("add_or_update_sincedb_collection: switching as new file")
          watched_file.rotate_as_file
          watched_file.update_bytes_read(sincedb_value.position)
        else
          sincedb_value.set_watched_file(watched_file)
          logger.trace("add_or_update_sincedb_collection: switching from...", "watched_file details" => watched_file.details)
          watched_file.rotate_from(existing_watched_file)
        end

      end
      watched_file.initial_completed
    end

    def update_existing_sincedb_collection_value(watched_file, sincedb_value)
      logger.trace("update_existing_sincedb_collection_value: #{watched_file.path}, last value #{sincedb_value.position}, cur size #{watched_file.last_stat_size}")
      # sincedb_value is the source of truth
      watched_file.update_bytes_read(sincedb_value.position)
    end

    def add_new_value_sincedb_collection(watched_file)
      sincedb_value = SincedbValue.new(0)
      sincedb_value.set_watched_file(watched_file)
      logger.trace("add_new_value_sincedb_collection: #{watched_file.path}", "position" => sincedb_value.position)
      sincedb_collection.set(watched_file.sincedb_key, sincedb_value)
    end
  end
end end end
