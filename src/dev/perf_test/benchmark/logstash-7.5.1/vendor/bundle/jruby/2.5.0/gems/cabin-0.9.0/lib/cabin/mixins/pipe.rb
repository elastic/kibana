require "cabin/namespace"

# This module provides a 'pipe' method which instructs cabin to pipe anything
# read from the IO given to be logged.
module Cabin::Mixins::Pipe

  # Pipe IO objects to method calls on a logger.
  #
  # The argument is a hash of IO to method symbols. 
  #
  #     logger.pipe(io => :the_method)
  #
  # For each line read from 'io', logger.the_method(the_line) will be called.
  #
  # Example:
  #
  #     cmd = "strace -e trace=write date"
  #     Open4::popen4(cmd) do |pid, stdin, stdout, stderr|
  #       stdin.close
  #
  #       # Make lines from stdout be logged as 'info'
  #       # Make lines from stderr be logged as 'error'
  #       logger.pipe(stdout => :info, stderr => :error)
  #     end
  #
  # Output:
  #
  #     write(1, "Fri Jan 11 22:49:42 PST 2013\n", 29) = 29 {"level":"error"}
  #     Fri Jan 11 22:49:42 PST 2013 {"level":"info"}
  #     +++ exited with 0 +++ {"level":"error"}
  def pipe(io_to_method_map, &block)
    fds = io_to_method_map.keys

    while !fds.empty?
      readers, _, _ = IO.select(fds, nil, nil, nil)
      readers.each do |fd|
        begin
          line = fd.readline.chomp
        rescue EOFError
          fd.close rescue nil
          fds.delete(fd)
          next
        end

        method_name = io_to_method_map[fd]
        block.call(line, method_name) if block_given?
        send(method_name, line)
      end # readers.each
    end # while !fds.empty?
  end # def pipe
end # module Cabin::Mixins::Logger
