# encoding: utf-8

module FileWatch
  # Tracks the position and expiry of the offset of a file-of-interest
  # NOTE: the `watched_file.bytes_read` and this `sincedb_value.position` can diverge
  # At any given moment IF the `watched_file.bytes_read` is greater than `sincedb_value.position`
  # then it is larger to account for bytes held in the `watched_file.buffer`
  # in Tail mode if we quit the buffer is not flushed and we restart from
  # the `sincedb_value.position` (end of the last line read).
  # in Read mode the buffer is flushed as a line and both values should be the same.
  class SincedbValue
    attr_reader :last_changed_at, :watched_file, :path_in_sincedb, :position

    def initialize(position, last_changed_at = nil, watched_file = nil)
      @position = position # this is the value read from disk
      @last_changed_at = last_changed_at
      @watched_file = watched_file
      touch if @last_changed_at.nil? || @last_changed_at.zero?
    end

    def add_path_in_sincedb(path)
      @path_in_sincedb = path # can be nil
      self
    end

    def last_changed_at_expires(duration)
      @last_changed_at + duration
    end

    def update_position(pos)
      # called when we reset the position to bof or eof on shrink or file read complete
      touch
      @position = pos
      @watched_file.update_bytes_read(pos) unless @watched_file.nil?
    end

    def increment_position(pos)
      # called when actual lines are sent to the observer listener
      # this gets serialized as its a more true indication of position than
      # chunk read size
      touch
      @position += pos
    end

    def set_watched_file(watched_file)
      touch
      @watched_file = watched_file
    end

    def touch
      @last_changed_at = Time.now.to_f
    end

    def to_s
      # consider serializing the watched_file state as well
      "#{position} #{last_changed_at}".tap do |s|
        if @watched_file.nil?
          s.concat(" ").concat(@path_in_sincedb) unless @path_in_sincedb.nil?
        else
          s.concat(" ").concat(@watched_file.path)
        end
      end
    end

    def clear_watched_file
      @watched_file = nil
    end

    def reading_completed
      touch
      @path_in_sincedb = @watched_file.path
      @position = @watched_file.bytes_read
    end

    def unset_watched_file
      # called in read mode only because we flushed any remaining bytes as a final line.
      # cache the position
      # we don't cache the path here because we know we are done with this file.
      # either due via the `delete` handling
      # or when read mode is done with a file.
      # in the case of `delete` if the file was renamed then @watched_file is the
      # watched_file of the previous path and the new path will be discovered and
      # it should have the same inode as before.
      # The key from the new watched_file should then locate this entry and we
      # can resume from the cached position
      return if @watched_file.nil?
      wf = @watched_file
      @watched_file = nil
      @position = wf.bytes_read
    end
  end
end
