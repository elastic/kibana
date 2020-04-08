# encoding: utf-8

## Interface API topology
# ObservingBase module (this file)
#   is a module mixin proving common constructor and external API for File Input Plugin interaction
#   calls build_specific_processor on ObservingRead or ObservingTail
# ObservingRead and ObservingTail
#   provides the External API method subscribe(observer = NullObserver.new)
#   build_specific_processor(settings) - provide a Tail or Read specific Processor.
# TailMode::Processor or ReadMode::Processor
#   initialize_handlers(sincedb_collection, observer) - called when the observer subscribes to changes in a Mode,
#      builds mode specific handler instances with references to the observer
#   process_closed(watched_files) - provide specific processing of watched_files in the closed state
#   process_ignored(watched_files) - provide specific processing of watched_files in the ignored state
#   process_watched(watched_files) - provide specific processing of watched_files in the watched state
#   process_active(watched_files)  - provide specific processing of watched_files in the active state
#      These methods can call "handler" methods that delegate to the specific Handler classes.
# TailMode::Handlers module namespace
#   contains the Handler classes that deals with Tail mode file lifecycle "events".
#   The TailMode::Handlers::Base
#      handle(watched_file) - this method calls handle_specifically defined in a subclass
#      handle_specifically(watched_file) - this is a noop method
#      update_existing_specifically(watched_file, sincedb_value) - this is a noop method
#   Each handler extends the Base class to provide specific implementations of these two methods:
#      handle_specifically(watched_file)
#      update_existing_specifically(watched_file, sincedb_value)
# ReadMode::Handlers module namespace
#   contains the Handler classes that deals with Read mode file lifecycle "events".
#   The ReadMode::Handlers::Base
#      handle(watched_file) - this method calls handle_specifically defined in a subclass
#      handle_specifically(watched_file) - this is a noop method
#   Each handler extends the Base class to provide specific implementations of this method:
#      handle_specifically(watched_file)

module FileWatch
  module ObservingBase
    attr_reader :watch, :sincedb_collection, :settings

    def initialize(opts={})
      options = {
        :sincedb_write_interval => 10,
        :stat_interval => 1,
        :discover_interval => 5,
        :exclude => [],
        :start_new_files_at => :end,
        :delimiter => "\n",
        :file_chunk_count => MAX_ITERATIONS,
        :file_chunk_size => FILE_READ_SIZE,
        :file_sort_by => "last_modified",
        :file_sort_direction => "asc",
      }.merge(opts)
      unless options.include?(:sincedb_path)
        raise NoSinceDBPathGiven.new("No sincedb_path set in options. This should have been added in the main LogStash::Inputs::File class")
      end
      @settings = Settings.from_options(options)
      build_watch_and_dependencies
    end

    def build_watch_and_dependencies
      logger.info("START, creating Discoverer, Watch with file and sincedb collections")
      watched_files_collection = WatchedFilesCollection.new(@settings)
      @sincedb_collection = SincedbCollection.new(@settings)
      @sincedb_collection.open
      discoverer = Discoverer.new(watched_files_collection, @sincedb_collection, @settings)
      @watch = Watch.new(discoverer, watched_files_collection, @settings)
      @watch.add_processor build_specific_processor(@settings)
    end

    def watch_this(path)
      @watch.watch(path)
    end

    def sincedb_write(reason=nil)
      # can be invoked from the file input
      @sincedb_collection.write(reason)
    end

    # quit is a sort-of finalizer,
    # it should be called for clean up
    # before the instance is disposed of.
    def quit
      logger.info("QUIT - closing all files and shutting down.")
      @watch.quit # <-- should close all the files
      # sincedb_write("shutting down")
    end

    # close_file(path) is to be used by external code
    # when it knows that it is completely done with a file.
    # Other files or folders may still be being watched.
    # Caution, once unwatched, a file can't be watched again
    # unless a new instance of this class begins watching again.
    # The sysadmin should rename, move or delete the file.
    def close_file(path)
      @watch.unwatch(path)
      sincedb_write
    end
  end
end
