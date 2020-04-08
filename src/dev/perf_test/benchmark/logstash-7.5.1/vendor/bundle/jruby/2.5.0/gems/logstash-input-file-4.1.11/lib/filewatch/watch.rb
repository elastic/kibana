# encoding: utf-8
require "logstash/util/loggable"

module FileWatch
  class Watch
    include LogStash::Util::Loggable

    attr_accessor :lastwarn_max_files
    attr_reader :discoverer, :watched_files_collection

    def initialize(discoverer, watched_files_collection, settings)
      @settings = settings
      # we need to be threadsafe about the quit mutation
      @quit = Concurrent::AtomicBoolean.new(false)
      @lastwarn_max_files = 0
      @discoverer = discoverer
      @watched_files_collection = watched_files_collection
    end

    def add_processor(processor)
      @processor = processor
      @processor.add_watch(self)
      self
    end

    def watch(path)
      @discoverer.add_path(path)
      # don't return whatever @discoverer.add_path returns
      return true
    end

    def discover
      @discoverer.discover
      # don't return whatever @discoverer.discover returns
      return true
    end

    def subscribe(observer, sincedb_collection)
      @processor.initialize_handlers(sincedb_collection, observer)

      glob = 0
      interval = @settings.discover_interval
      reset_quit
      until quit?
        iterate_on_state
        break if quit?
        sincedb_collection.write_if_requested
        glob += 1
        if glob == interval
          discover
          glob = 0
        end
        break if quit?
        sleep(@settings.stat_interval)
      end
      sincedb_collection.write_if_requested # does nothing if no requests to write were lodged.
      @watched_files_collection.close_all
    end # def subscribe

    # Read mode processor will handle watched_files in the closed, ignored, watched and active state
    # differently from Tail mode - see the ReadMode::Processor and TailMode::Processor
    def iterate_on_state
      return if @watched_files_collection.empty?
      begin
        # creates this snapshot of watched_file values just once
        watched_files = @watched_files_collection.values
        @processor.process_all_states(watched_files)
      ensure
        @watched_files_collection.delete(@processor.deletable_filepaths)
        @processor.deletable_filepaths.clear
      end
    end # def each

    def quit
      @quit.make_true
    end

    def quit?
      @quit.true?
    end

    private

    def reset_quit
      @quit.make_false
    end
  end
end
