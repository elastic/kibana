# encoding: utf-8
require "logstash/util/loggable"

module FileWatch
  class Discoverer
    # given a path or glob will prepare for and discover files to watch
    # if they are not excluded or ignorable
    # they are added to the watched_files collection and
    # associated with a sincedb entry if one can be found
    include LogStash::Util::Loggable

    def initialize(watched_files_collection, sincedb_collection, settings)
      @watching = Concurrent::Array.new
      @exclude = Concurrent::Array.new
      @watched_files_collection = watched_files_collection
      @sincedb_collection = sincedb_collection
      @settings = settings
      @settings.exclude.each { |p| @exclude << p }
    end

    def add_path(path)
      return if @watching.member?(path)
      @watching << path
      discover_files_new_path(path)
      self
    end

    def discover
      @watching.each do |path|
        discover_files_ongoing(path)
      end
    end

    private

    def can_exclude?(watched_file, new_discovery)
      @exclude.each do |pattern|
        if watched_file.pathname.fnmatch?(pattern)
          if new_discovery
            logger.trace("Discoverer can_exclude?: #{watched_file.path}: skipping " +
              "because it matches exclude #{pattern}")
          end
          watched_file.unwatch
          return true
        end
      end
      false
    end

    def discover_files_new_path(path)
      discover_any_files(path, false)
    end

    def discover_files_ongoing(path)
      discover_any_files(path, true)
    end

    def discover_any_files(path, ongoing)
      fileset = Dir.glob(path).select{|f| File.file?(f)}
      logger.trace("discover_files",  "count" => fileset.size)
      fileset.each do |file|
        pathname = Pathname.new(file)
        new_discovery = false
        watched_file = @watched_files_collection.watched_file_by_path(file)
        if watched_file.nil?
          begin
            path_stat = PathStatClass.new(pathname)
          rescue Errno::ENOENT
            next
          end
          watched_file = WatchedFile.new(pathname, path_stat, @settings)
          new_discovery = true
        end
        # if it already unwatched or its excluded then we can skip
        next if watched_file.unwatched? || can_exclude?(watched_file, new_discovery)

        logger.trace("discover_files handling:", "new discovery"=> new_discovery, "watched_file details" => watched_file.details)

        if new_discovery
          watched_file.initial_completed if ongoing
          # initially when the sincedb collection is filled with records from the persistence file
          # each value is not associated with a watched file
          # a sincedb_value can be:
          #   unassociated
          #   associated with this watched_file
          #   associated with a different watched_file
          if @sincedb_collection.associate(watched_file)
            if watched_file.file_ignorable?
              logger.trace("Discoverer discover_files: #{file}: skipping because it was last modified more than #{@settings.ignore_older} seconds ago")
              # on discovery ignorable watched_files are put into the ignored state and that
              # updates the size from the internal stat
              # so the existing contents are not read.
              # because, normally, a newly discovered file will
              # have a watched_file size of zero
              # they are still added to the collection so we know they are there for the next periodic discovery
              watched_file.ignore_as_unread
            end
            # now add the discovered file to the watched_files collection and adjust the sincedb collections
            @watched_files_collection.add(watched_file)
          end
        end
        # at this point the watched file is created, is in the db but not yet opened or being processed
      end
    end
  end
end
