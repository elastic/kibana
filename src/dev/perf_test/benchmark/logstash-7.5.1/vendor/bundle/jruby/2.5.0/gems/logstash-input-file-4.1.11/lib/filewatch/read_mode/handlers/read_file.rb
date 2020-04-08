# encoding: utf-8

module FileWatch module ReadMode module Handlers
  class ReadFile < Base
    def handle_specifically(watched_file)
      if open_file(watched_file)
        add_or_update_sincedb_collection(watched_file) unless sincedb_collection.member?(watched_file.sincedb_key)
        loop do
          break if quit?
          loop_control = watched_file.loop_control_adjusted_for_stat_size
          controlled_read(watched_file, loop_control)
          sincedb_collection.request_disk_flush
          break unless loop_control.keep_looping?
        end
        if watched_file.all_read?
          # flush the buffer now in case there is no final delimiter
          line = watched_file.buffer.flush
          watched_file.listener.accept(line) unless line.empty?
          watched_file.listener.eof
          watched_file.file_close
          key = watched_file.sincedb_key
          sincedb_collection.reading_completed(key)
          sincedb_collection.clear_watched_file(key)
          watched_file.listener.deleted
          watched_file.unwatch
        end
      end
    end

    def controlled_read(watched_file, loop_control)
      logger.trace("reading...", "iterations" => loop_control.count, "amount" => loop_control.size, "filename" => watched_file.filename)
      loop_control.count.times do
        break if quit?
        begin
          result = watched_file.read_extract_lines(loop_control.size) # expect BufferExtractResult
          logger.info(result.warning, result.additional) unless result.warning.empty?
          result.lines.each do |line|
            watched_file.listener.accept(line)
            # sincedb position is independent from the watched_file bytes_read
            delta = line.bytesize + @settings.delimiter_byte_size
            sincedb_collection.increment(watched_file.sincedb_key, delta)
          end
        rescue EOFError
          logger.error("controlled_read: eof error reading file", "path" => watched_file.path, "error" => e.inspect, "backtrace" => e.backtrace.take(8))
          loop_control.flag_read_error
          break
        rescue Errno::EWOULDBLOCK, Errno::EINTR
          logger.error("controlled_read: block or interrupt error reading file", "path" => watched_file.path, "error" => e.inspect, "backtrace" => e.backtrace.take(8))
          watched_file.listener.error
          loop_control.flag_read_error
          break
        rescue => e
          logger.error("controlled_read: general error reading file", "path" => watched_file.path, "error" => e.inspect, "backtrace" => e.backtrace.take(8))
          watched_file.listener.error
          loop_control.flag_read_error
          break
        end
      end
    end
  end
end end end
