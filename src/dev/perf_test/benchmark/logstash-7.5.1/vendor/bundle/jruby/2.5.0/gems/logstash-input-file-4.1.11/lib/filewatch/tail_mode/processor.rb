# encoding: utf-8
require "logstash/util/loggable"
require_relative "handlers/base"
require_relative "handlers/create_initial"
require_relative "handlers/create"
require_relative "handlers/delete"
require_relative "handlers/grow"
require_relative "handlers/shrink"
require_relative "handlers/timeout"
require_relative "handlers/unignore"

module FileWatch module TailMode
  # Must handle
  #   :create_initial - file is discovered and we have no record of it in the sincedb
  #   :create - file is discovered and we have seen it before in the sincedb
  #   :grow   - file has more content
  #   :shrink - file has less content
  #   :delete   - file can't be read
  #   :timeout - file is closable
  #   :unignore - file was ignored, but have now received new content
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
      @sincedb_collection = sincedb_collection
      @create_initial = Handlers::CreateInitial.new(self, sincedb_collection, observer, @settings)
      @create = Handlers::Create.new(self, sincedb_collection, observer, @settings)
      @grow = Handlers::Grow.new(self, sincedb_collection, observer, @settings)
      @shrink = Handlers::Shrink.new(self, sincedb_collection, observer, @settings)
      @delete = Handlers::Delete.new(self, sincedb_collection, observer, @settings)
      @timeout = Handlers::Timeout.new(self, sincedb_collection, observer, @settings)
      @unignore = Handlers::Unignore.new(self, sincedb_collection, observer, @settings)
    end

    def create(watched_file)
      @create.handle(watched_file)
    end

    def create_initial(watched_file)
      @create_initial.handle(watched_file)
    end

    def grow(watched_file)
      @grow.handle(watched_file)
    end

    def shrink(watched_file)
      @shrink.handle(watched_file)
    end

    def delete(watched_file)
      @delete.handle(watched_file)
    end

    def timeout(watched_file)
      @timeout.handle(watched_file)
    end

    def unignore(watched_file)
      @unignore.handle(watched_file)
    end

    def process_all_states(watched_files)
      process_closed(watched_files)
      return if watch.quit?
      process_ignored(watched_files)
      return if watch.quit?
      process_delayed_delete(watched_files)
      return if watch.quit?
      process_restat_for_watched_and_active(watched_files)
      return if watch.quit?
      process_rotation_in_progress(watched_files)
      return if watch.quit?
      process_watched(watched_files)
      return if watch.quit?
      process_active(watched_files)
    end

    private

    def process_closed(watched_files)
      # logger.trace("Closed processing")
      # Handles watched_files in the closed state.
      # if its size changed it is put into the watched state
      watched_files.select {|wf| wf.closed? }.each do |watched_file|
        common_restat_with_delay(watched_file, "Closed") do
          # it won't do this if rotation is detected
          if watched_file.size_changed?
            # if the closed file changed, move it to the watched state
            # not to active state because we want to respect the active files window.
            watched_file.watch
          end
        end
        break if watch.quit?
      end
    end

    def process_ignored(watched_files)
      # logger.trace("Ignored processing")
      # Handles watched_files in the ignored state.
      # if its size changed:
      #   put it in the watched state
      #   invoke unignore
      watched_files.select {|wf| wf.ignored? }.each do |watched_file|
        common_restat_with_delay(watched_file, "Ignored") do
          # it won't do this if rotation is detected
          if watched_file.size_changed?
            watched_file.watch
            unignore(watched_file)
          end
        end
        break if watch.quit?
      end
    end

    def process_delayed_delete(watched_files)
      # defer the delete to one loop later to ensure that the stat really really can't find a renamed file
      # because a `stat` can be called right in the middle of the rotation rename cascade
      logger.trace("Delayed Delete processing")
      watched_files.select {|wf| wf.delayed_delete?}.each do |watched_file|
        logger.trace(">>> Delayed Delete", "path" => watched_file.filename)
        common_restat_without_delay(watched_file, ">>> Delayed Delete") do
          logger.trace(">>> Delayed Delete: file at path found again", "watched_file" => watched_file.details)
          watched_file.file_at_path_found_again
        end
      end
    end

    def process_restat_for_watched_and_active(watched_files)
      # do restat on all watched and active states once now. closed and ignored have been handled already
      logger.trace("Watched + Active restat processing")
      watched_files.select {|wf| wf.watched? || wf.active?}.each do |watched_file|
        common_restat_with_delay(watched_file, "Watched")
      end
    end

    def process_rotation_in_progress(watched_files)
      logger.trace("Rotation In Progress processing")
      watched_files.select {|wf| wf.rotation_in_progress?}.each do |watched_file|
        if !watched_file.all_read?
          if watched_file.file_open?
            # rotated file but original opened file is not fully read
            # we need to keep reading the open file, if we close it we lose it because the path is now pointing at a different file.
            logger.trace(">>> Rotation In Progress - inode change detected and original content is not fully read, reading all", "watched_file details" => watched_file.details)
            # need to fully read open file while we can
            watched_file.set_maximum_read_loop
            grow(watched_file)
            watched_file.set_standard_read_loop
          else
            logger.warn(">>> Rotation In Progress - inode change detected and original content is not fully read, file is closed and path points to new content", "watched_file details" => watched_file.details)
          end
        end
        current_key = watched_file.sincedb_key
        sdb_value = @sincedb_collection.get(current_key)
        potential_key = watched_file.stat_sincedb_key
        potential_sdb_value =  @sincedb_collection.get(potential_key)
        logger.trace(">>> Rotation In Progress", "watched_file" => watched_file.details, "found_sdb_value" => sdb_value, "potential_key" => potential_key, "potential_sdb_value" => potential_sdb_value)
        if potential_sdb_value.nil?
          logger.trace("---------- >>>> Rotation In Progress: rotating as existing file")
          watched_file.rotate_as_file
          trace_message = "---------- >>>> Rotation In Progress: no potential sincedb value "
          if sdb_value.nil?
            trace_message.concat("AND no found sincedb value")
          else
            trace_message.concat("BUT found sincedb value")
            sdb_value.clear_watched_file
          end
          logger.trace(trace_message)
          new_sdb_value = SincedbValue.new(0)
          new_sdb_value.set_watched_file(watched_file)
          @sincedb_collection.set(potential_key, new_sdb_value)
        else
          other_watched_file = potential_sdb_value.watched_file
          if other_watched_file.nil?
            logger.trace("---------- >>>> Rotation In Progress: rotating as existing file WITH potential sincedb value that does not have a watched file reference !!!!!!!!!!!!!!!!!")
            watched_file.rotate_as_file(potential_sdb_value.position)
            sdb_value.clear_watched_file unless sdb_value.nil?
            potential_sdb_value.set_watched_file(watched_file)
          else
            logger.trace("---------- >>>> Rotation In Progress: rotating from...", "this watched_file details" => watched_file.details, "other watched_file details" => other_watched_file.details)
            watched_file.rotate_from(other_watched_file)
            sdb_value.clear_watched_file unless sdb_value.nil?
            potential_sdb_value.set_watched_file(watched_file)
          end
        end
        logger.trace("---------- >>>> Rotation In Progress: after handling rotation", "this watched_file details" => watched_file.details, "sincedb_value" => (potential_sdb_value || sdb_value))
      end
    end

    def process_watched(watched_files)
      # Handles watched_files in the watched state.
      # for a slice of them:
      #   move to the active state
      #   and we allow the block to open the file and create a sincedb collection record if needed
      #   some have never been active and some have
      #   those that were active before but are watched now were closed under constraint
      logger.trace("Watched processing")
      # how much of the max active window is available
      to_take = @settings.max_active - watched_files.count{|wf| wf.active?}
      if to_take > 0
        watched_files.select {|wf| wf.watched?}.take(to_take).each do |watched_file|
          watched_file.activate
          if watched_file.initial?
            create_initial(watched_file)
          else
            create(watched_file)
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

    def process_active(watched_files)
      # logger.trace("Active processing")
      # Handles watched_files in the active state.
      # files have been opened at this point
      watched_files.select {|wf| wf.active? }.each do |watched_file|
        break if watch.quit?
        path = watched_file.filename
        if watched_file.grown?
          logger.trace("Active - file grew: #{path}: new size is #{watched_file.last_stat_size}, bytes read #{watched_file.bytes_read}")
          grow(watched_file)
        elsif watched_file.shrunk?
          if watched_file.bytes_unread > 0
            logger.warn("Active - shrunk: DATA LOSS!! truncate detected with #{watched_file.bytes_unread} unread bytes: #{path}")
          end
          # we don't update the size here, its updated when we actually read
          logger.trace("Active - file shrunk #{path}: new size is #{watched_file.last_stat_size}, old size #{watched_file.bytes_read}")
          shrink(watched_file)
        else
          # same size, do nothing
          logger.trace("Active - no change", "watched_file" => watched_file.details)
        end
        # can any active files be closed to make way for waiting files?
        if watched_file.file_closable?
          logger.trace("Watch each: active: file expired: #{path}")
          timeout(watched_file)
          watched_file.close
        end
      end
    end

    def common_restat_with_delay(watched_file, action, &block)
      common_restat(watched_file, action, true, &block)
    end

    def common_restat_without_delay(watched_file, action, &block)
      common_restat(watched_file, action, false, &block)
    end

    def common_restat(watched_file, action, delay, &block)
      all_ok = true
      begin
        watched_file.restat
        if watched_file.rotation_in_progress?
          logger.trace("-------------------- >>>>> restat - rotation_detected", "watched_file details" => watched_file.details, "new sincedb key" => watched_file.stat_sincedb_key)
          # don't yield to closed and ignore processing
        else
          yield if block_given?
        end
      rescue Errno::ENOENT
        if delay
          logger.trace("#{action} - delaying the stat fail on: #{watched_file.filename}")
          watched_file.delay_delete
        else
          # file has gone away or we can't read it anymore.
          logger.trace("#{action} - after a delay, really can't find this file: #{watched_file.filename}")
          watched_file.unwatch
          logger.trace("#{action} - removing from collection: #{watched_file.filename}")
          delete(watched_file)
          deletable_filepaths << watched_file.path
          all_ok = false
        end
      rescue => e
        logger.error("#{action} - other error #{watched_file.path}: (#{e.message}, #{e.backtrace.take(8).inspect})")
        all_ok = false
      end
      all_ok
    end
  end
end end
