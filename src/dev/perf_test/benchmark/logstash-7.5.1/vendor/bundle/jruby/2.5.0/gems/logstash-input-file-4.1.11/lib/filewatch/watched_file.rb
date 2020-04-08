# encoding: utf-8

module FileWatch
  class WatchedFile
    PATH_BASED_STAT = 0
    IO_BASED_STAT = 1

    attr_reader :bytes_read, :state, :file, :buffer, :recent_states, :bytes_unread
    attr_reader :path, :accessed_at, :modified_at, :pathname, :filename
    attr_reader :listener, :read_loop_count, :read_chunk_size, :stat
    attr_reader :loop_count_type, :loop_count_mode
    attr_accessor :last_open_warning_at

    # this class represents a file that has been discovered
    # path based stat is taken at discovery
    def initialize(pathname, stat, settings)
      @settings = settings
      @pathname = Pathname.new(pathname) # given arg pathname might be a string or a Pathname object
      @path = @pathname.to_path
      @filename = @pathname.basename.to_s
      full_state_reset(stat)
      watch
      set_standard_read_loop
      set_accessed_at
    end

    def no_restat_reset
      full_state_reset(@stat)
    end

    def full_state_reset(this_stat = nil)
      if this_stat.nil?
        begin
          this_stat = PathStatClass.new(pathname)
        rescue Errno::ENOENT
          delay_delete
          return
        end
      end
      @bytes_read = 0 # tracks bytes read from the open file or initialized from a matched sincedb_value off disk.
      @bytes_unread = 0 # tracks bytes not yet read from the open file. So we can warn on shrink when unread bytes are seen.
      file_close
      set_stat(this_stat)
      @listener = nil
      @last_open_warning_at = nil
      # initial as true means we have not associated this watched_file with a previous sincedb value yet.
      # and we should read from the beginning if necessary
      @initial = true
      @recent_states = [] # keep last 8 states, managed in set_state
      # the prepare_inode method is sourced from the mixed module above
      watch if active? || @state.nil?
    end

    def rotate_from(other)
      # move all state from other to this one
      set_standard_read_loop
      file_close
      @bytes_read = other.bytes_read
      @bytes_unread = other.bytes_unread
      @listener = nil
      @initial = false
      @recent_states = other.recent_states
      @accessed_at = other.accessed_at
      if !other.delayed_delete?
        # we don't know if a file exists at the other.path yet
        # so no reset
        other.full_state_reset
      end
      set_stat PathStatClass.new(pathname)
      ignore
    end

    def set_stat(stat)
      @stat = stat
      @size = @stat.size
      @sdb_key_v1 = @stat.inode_struct
    end

    def rotate_as_file(bytes_read = 0)
      # rotation, when a sincedb record exists for new inode, but no watched file to rotate from
      # probably caused by a deletion detected in the middle of the rename cascade
      # RARE due to delayed_delete - there would have to be a large time span between the renames.
      @bytes_read = bytes_read # tracks bytes read from the open file or initialized from a matched sincedb_value off disk.
      @bytes_unread = 0 # tracks bytes not yet read from the open file. So we can warn on shrink when unread bytes are seen.
      @last_open_warning_at = nil
      # initial as true means we have not associated this watched_file with a previous sincedb value yet.
      # and we should read from the beginning if necessary
      @initial = false
      @recent_states = [] # keep last 8 states, managed in set_state
      set_stat(PathStatClass.new(pathname))
      reopen
      watch
    end

    def stat_sincedb_key
      @stat.inode_struct
    end

    def rotation_detected?
      stat_sincedb_key != sincedb_key
    end

    def restat
      @stat.restat
      if rotation_detected?
        # switch to new state now
        rotation_in_progress
      else
        @size = @stat.size
        update_bytes_unread
      end
    end

    def modified_at
      @stat.modified_at
    end

    def position_for_new_sincedb_value
      if @initial
        # this file was found in first discovery
        @settings.start_new_files_at == :beginning ? 0 : last_stat_size
      else
        # always start at the beginning if found after first discovery
        0
      end
    end

    def last_stat_size
      @stat.size
    end

    def current_size
      @size
    end

    def shrunk?
      @size < @bytes_read
    end

    def grown?
      @size > @bytes_read
    end

    def size_changed?
      # called from closed and ignored
      # before the last stat was taken file should be fully read.
      @size != @bytes_read
    end

    def all_read?
      @bytes_read >= @size
    end

    def file_at_path_found_again
      restore_previous_state
    end

    def set_listener(observer)
      @listener = observer.listener_for(@path)
    end

    def unset_listener
      @listener = nil
    end

    def has_listener?
      !@listener.nil?
    end

    def sincedb_key
      @sdb_key_v1
    end

    def initial_completed
      @initial = false
    end

    def set_accessed_at
      @accessed_at = Time.now.to_f
    end

    def initial?
      @initial
    end

    def compressed?
      @path.end_with?('.gz','.gzip')
    end

    def reopen
      if file_open?
        file_close
        open
      end
    end

    def open
      file_add_opened(FileOpener.open(@path))
    end

    def file_add_opened(rubyfile)
      @file = rubyfile
      @buffer = BufferedTokenizer.new(@settings.delimiter) if @buffer.nil?
    end

    def file_close
      return if @file.nil? || @file.closed?
      @file.close
      @file = nil
    end

    def file_seek(amount, whence = IO::SEEK_SET)
      @file.sysseek(amount, whence)
    end

    def file_read(amount = nil)
      set_accessed_at
      @file.sysread(amount || @read_chunk_size)
    end

    def file_open?
      !@file.nil? && !@file.closed?
    end

    def reset_buffer
      @buffer.flush
    end

    def read_extract_lines(amount)
      data = file_read(amount)
      result = buffer_extract(data)
      increment_bytes_read(data.bytesize)
      result
    end

    def buffer_extract(data)
      warning, additional = "", {}
      lines = @buffer.extract(data)
      if lines.empty?
        warning.concat("buffer_extract: a delimiter can't be found in current chunk")
        warning.concat(", maybe there are no more delimiters or the delimiter is incorrect")
        warning.concat(" or the text before the delimiter, a 'line', is very large")
        warning.concat(", if this message is logged often try increasing the `file_chunk_size` setting.")
        additional["delimiter"] = @settings.delimiter
        additional["read_position"] = @bytes_read
        additional["bytes_read_count"] = data.bytesize
        additional["last_known_file_size"] = last_stat_size
        additional["file_path"] = @path
      end
      BufferExtractResult.new(lines, warning, additional)
    end

    def increment_bytes_read(delta)
      return if delta.nil?
      @bytes_read += delta
      update_bytes_unread
      @bytes_read
    end

    def update_bytes_read(total_bytes_read)
      return if total_bytes_read.nil?
      @bytes_read = total_bytes_read
      update_bytes_unread
      @bytes_read
    end

    def rotation_in_progress
      set_state :rotation_in_progress
    end

    def activate
      set_state :active
    end

    def ignore
      set_state :ignored
    end

    def ignore_as_unread
      ignore
      @bytes_read = @size
    end

    def close
      set_state :closed
    end

    def watch
      set_state :watched
    end

    def unwatch
      set_state :unwatched
    end

    def delay_delete
      set_state :delayed_delete
    end

    def restore_previous_state
      set_state @recent_states.pop
    end

    def rotation_in_progress?
      @state == :rotation_in_progress
    end

    def active?
      @state == :active
    end

    def delayed_delete?
      @state == :delayed_delete
    end

    def ignored?
      @state == :ignored
    end

    def closed?
      @state == :closed
    end

    def watched?
      @state == :watched
    end

    def unwatched?
      @state == :unwatched
    end

    def expiry_close_enabled?
      !@settings.close_older.nil?
    end

    def expiry_ignore_enabled?
      !@settings.ignore_older.nil?
    end

    def set_standard_read_loop
      @read_loop_count = @settings.file_chunk_count
      @read_chunk_size = @settings.file_chunk_size
      # e.g. 1 * 10 bytes -> 10 or 256 * 65536 -> 1677716 or 140737488355327 * 32768 -> 4611686018427355136
      @standard_loop_max_bytes = @read_loop_count * @read_chunk_size
    end

    def set_maximum_read_loop
      # used to quickly fully read an open file when rotation is detected
      @read_loop_count = FileWatch::MAX_ITERATIONS
      @read_chunk_size = FileWatch::FILE_READ_SIZE
      @standard_loop_max_bytes = @read_loop_count * @read_chunk_size
    end

    def loop_control_adjusted_for_stat_size
      more = false
      to_read = current_size - @bytes_read
      return LoopControlResult.new(0, 0, more) if to_read < 1
      return LoopControlResult.new(1, to_read, more) if to_read < @read_chunk_size
      # set as if to_read is greater than or equal to max_bytes
      # use the ones from settings and don't indicate more
      count = @read_loop_count
      if to_read < @standard_loop_max_bytes
        # if the defaults are used then this branch will be taken
        # e.g. to_read is 100 and max_bytes is 4 * 30 -> 120
        # will overrun and trigger EOF, build less iterations
        # will generate 3 * 30 -> 90 this time and we indicate more
        # a 2GB file in read mode will get one loop of 64666 x 32768 (2119006656 / 32768)
        # and a second loop with 1 x 31168
        count = to_read / @read_chunk_size
        more = true
      end
      LoopControlResult.new(count, @read_chunk_size, more)
    end

    def reset_bytes_unread
      # called from shrink
      @bytes_unread = 0
    end

    def set_state(value)
      @recent_states.shift if @recent_states.size == 8
      @recent_states << @state unless @state.nil?
      @state = value
    end

    def recent_state_history
      @recent_states + Array(@state)
    end

    def file_closable?
      file_can_close? && all_read?
    end

    def file_ignorable?
      return false unless expiry_ignore_enabled?
      # (Time.now - stat.mtime) <- in jruby, this does int and float
      # conversions before the subtraction and returns a float.
      # so use all floats upfront
      (Time.now.to_f - modified_at) > @settings.ignore_older
    end

    def file_can_close?
      return false unless expiry_close_enabled?
      (Time.now.to_f - @accessed_at) > @settings.close_older
    end

    def details
      detail = "@filename='#{filename}', @state='#{state}', @recent_states='#{@recent_states.inspect}', "
      detail.concat("@bytes_read='#{@bytes_read}', @bytes_unread='#{@bytes_unread}', current_size='#{current_size}', ")
      detail.concat("last_stat_size='#{last_stat_size}', file_open?='#{file_open?}', @initial=#{@initial}")
      "<FileWatch::WatchedFile: #{detail}, @sincedb_key='#{sincedb_key}'>"
    end

    def inspect
      "\"<FileWatch::WatchedFile: @filename='#{filename}', @state='#{state}', @sincedb_key='#{sincedb_key}, size=#{@size}>\""
    end

    def to_s
      inspect
    end

    private

    def update_bytes_unread
      unread = current_size - @bytes_read
      @bytes_unread = unread < 0 ? 0 : unread
    end
  end
end
