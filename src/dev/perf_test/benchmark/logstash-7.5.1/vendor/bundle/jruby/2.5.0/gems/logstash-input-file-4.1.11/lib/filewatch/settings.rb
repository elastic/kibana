# encoding: utf-8

module FileWatch
  class Settings
    attr_reader :delimiter, :close_older, :ignore_older, :delimiter_byte_size
    attr_reader :max_active, :max_warn_msg, :lastwarn_max_files
    attr_reader :sincedb_write_interval, :stat_interval, :discover_interval
    attr_reader :exclude, :start_new_files_at, :file_chunk_count, :file_chunk_size
    attr_reader :sincedb_path, :sincedb_write_interval, :sincedb_expiry_duration
    attr_reader :file_sort_by, :file_sort_direction

    def self.from_options(opts)
      new.add_options(opts)
    end

    def self.days_to_seconds(days)
      (24 * 3600) * days.to_f
    end

    def initialize
      defaults = {
        :delimiter => "\n",
        :file_chunk_size => FILE_READ_SIZE,
        :max_open_files => 4095,
        :file_chunk_count => MAX_ITERATIONS,
        :sincedb_clean_after => 14,
        :exclude => [],
        :stat_interval => 1,
        :discover_interval => 5,
        :file_sort_by => "last_modified",
        :file_sort_direction => "asc",
      }
      @opts = {}
      @lastwarn_max_files = 0
      add_options(defaults)
    end

    def add_options(opts)
      @opts.update(opts)
      self.max_open_files = @opts[:max_open_files]
      @delimiter = @opts[:delimiter]
      @delimiter_byte_size = @delimiter.bytesize
      @file_chunk_size = @opts[:file_chunk_size]
      @close_older = @opts[:close_older]
      @ignore_older = @opts[:ignore_older]
      @sincedb_write_interval = @opts[:sincedb_write_interval]
      @stat_interval = @opts[:stat_interval]
      @discover_interval = @opts[:discover_interval]
      @exclude = Array(@opts[:exclude])
      @start_new_files_at = @opts[:start_new_files_at]
      @file_chunk_count = @opts[:file_chunk_count]
      @sincedb_path = @opts[:sincedb_path]
      @sincedb_write_interval = @opts[:sincedb_write_interval]
      @sincedb_expiry_duration =  self.class.days_to_seconds(@opts.fetch(:sincedb_clean_after, 14))
      @file_sort_by = @opts[:file_sort_by]
      @file_sort_direction = @opts[:file_sort_direction]
      self
    end

    def max_open_files=(value)
      val = value.to_i
      val = 4095 if value.nil? || val <= 0
      @max_warn_msg = "Reached open files limit: #{val}, set by the 'max_open_files' option or default"
      @max_active = val
    end
  end
end
