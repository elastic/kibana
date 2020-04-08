module ChildProcess
  module Unix
  end
end

require "childprocess/unix/io"
require "childprocess/unix/process"
require "childprocess/unix/fork_exec_process"
# PosixSpawnProcess + ffi is required on demand.
