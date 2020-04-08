require 'ffi'


module PTY
  private
  module LibC
    extend FFI::Library
    # forkpty(3) is in libutil on linux, libc on MacOS/BSD
    if FFI::Platform.linux?
      ffi_lib 'libutil'
    else
      ffi_lib FFI::Library::LIBC
    end
    attach_function :forkpty, [ :buffer_out, :buffer_out, :buffer_in, :buffer_in ], :pid_t
    attach_function :openpty, [ :buffer_out, :buffer_out, :buffer_out, :buffer_in, :buffer_in ], :int
    attach_function :login_tty, [ :int ], :int
    attach_function :close, [ :int ], :int
    attach_function :strerror, [ :int ], :string
    attach_function :fork, [], :pid_t
    attach_function :execv, [ :string, :buffer_in ], :int
    attach_function :execvp, [ :string, :buffer_in ], :int
    attach_function :dup2, [ :int, :int ], :int
    attach_function :dup, [ :int ], :int
  end
  Buffer = FFI::Buffer
  def self.build_args(args)
    cmd = args.shift
    cmd_args = args.map do |arg|
      FFI::MemoryPointer.from_string(arg)
    end
    exec_args = FFI::MemoryPointer.new(:pointer, 1 + cmd_args.length + 1)
    exec_cmd = FFI::MemoryPointer.from_string(cmd)
    exec_args[0].put_pointer(0, exec_cmd)
    cmd_args.each_with_index do |arg, i|
      exec_args[i + 1].put_pointer(0, arg)
    end
    [ cmd, exec_args ]
  end
  public
  def self.getpty(*args)
    mfdp = Buffer.new :int
    name = Buffer.new 1024
    #
    # All the execv setup is done in the parent, since doing anything other than
    # execv in the child after fork is really flakey
    #
    exec_cmd, exec_args = build_args(args)
    pid = LibC.forkpty(mfdp, name, nil, nil)
    raise "forkpty failed: #{LibC.strerror(FFI.errno)}" if pid < 0    
    if pid == 0
      LibC.execvp(exec_cmd, exec_args)
      exit 1
    end
    masterfd = mfdp.get_int(0)
    rfp = FFI::IO.for_fd(masterfd, "r")
    wfp = FFI::IO.for_fd(LibC.dup(masterfd), "w")
    if block_given?
      yield rfp, wfp, pid
      rfp.close unless rfp.closed?
      wfp.close unless wfp.closed?
    else
      [ rfp, wfp, pid ]
    end
  end
  def self.spawn(*args, &block)
    self.getpty(*args, &block)
  end
end
module LibC
  extend FFI::Library
  ffi_lib FFI::Library::LIBC
  attach_function :close, [ :int ], :int
  attach_function :write, [ :int, :buffer_in, :size_t ], :ssize_t
  attach_function :read, [ :int, :buffer_out, :size_t ], :ssize_t
end
PTY.getpty("/bin/ls", "-alR", "/") { |rfd, wfd, pid|
#PTY.spawn("ls -laR /") { |rfd, wfd, pid|
  puts "child pid=#{pid}"
  while !rfd.eof? && (buf = rfd.gets)
    puts "child: '#{buf.strip}'"
  end
}