# encoding: utf-8
require "logstash/util/loggable"

require_relative "handlers/base"
require_relative "handlers/read_file"
require_relative "handlers/read_zip_file"

module FileWatch module ReadMode
  # Must handle
  #   :read_file
  #   :read_zip_file
  class Processor
    include LogStash::Util::Loggable

    attr_reader :watch, :deletable_filepaths

    def initialize(settings)
      @settings = settings
      @deletable_filepaths = []
    end

    def add_watch(watch)
      @watch = watch
      self
    end

    def initialize_handlers(sincedb_collection, observer)
      # we deviate from the tail mode handler initialization here
      # by adding a reference to self so we can read the quit flag during a (depth first) read loop
      @read_file = Handlers::ReadFile.new(self, sincedb_collection, observer, @settings)
      @read_zip_file = Handlers::ReadZipFile.new(self, sincedb_collection, observer, @settings)
    end

    def read_file(watched_file)
      @read_file.handle(watched_file)
    end

    def read_zip_file(watched_file)
      @read_zip_file.handle(watched_file)
    end

    def process_all_states(watched_files)
      process_watched(watched_files)
      return if watch.quit?
      process_active(watched_files)
    end

    private

    def process_watched(watched_files)
      logger.trace("Watched processing")
      # Handles watched_files in the watched state.
      # for a slice of them:
      #   move to the active state
      #   should never have been active before
      # how much of the max active window is available
      to_take = @settings.max_active - watched_files.count{|wf| wf.active?}
      if to_take > 0
        watched_files.select {|wf| wf.watched?}.take(to_take).each do |watched_file|
          path = watched_file.path
          begin
            watched_file.restat
            watched_file.activate
          rescue Errno::ENOENT
            common_deleted_reaction(watched_file, "Watched")
            next
          rescue => e
            common_error_reaction(path, e, "Watched")
            next
          end
          break if watch.quit?
        end
      else
        now = Time.now.to_i
        if (now - watch.lastwarn_max_files) > MAX_FILES_WARN_INTERVAL
          waiting = watched_files.size - @settings.max_active
          logger.warn(@settings.max_warn_msg + ", files yet to open: #{waiting}")
          watch.lastwarn_max_files = now
        end
      end
    end

    ## TODO add process_rotation_in_progress

    def process_active(watched_files)
      logger.trace("Active processing")
      # Handles watched_files in the active state.
      watched_files.select {|wf| wf.active? }.each do |watched_file|
        path = watched_file.path
        begin
          watched_file.restat
        rescue Errno::ENOENT
          common_deleted_reaction(watched_file, "Active")
          next
        rescue => e
          common_error_reaction(path, e, "Active")
          next
        end
        break if watch.quit?

        if watched_file.compressed?
          read_zip_file(watched_file)
        else
          read_file(watched_file)
        end
        # handlers take care of closing and unwatching
      end
    end

    def common_deleted_reaction(watched_file, action)
      # file has gone away or we can't read it anymore.
      watched_file.unwatch
      deletable_filepaths << watched_file.path
      logger.trace("#{action} - stat failed: #{watched_file.path}, removing from collection")
    end

    def common_error_reaction(path, error, action)
      logger.error("#{action} - other error #{path}: (#{error.message}, #{error.backtrace.take(8).inspect})")
    end
  end
end end
