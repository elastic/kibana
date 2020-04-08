module Fcntl
  class Flock < FFI::Struct
    self.size = 44
    layout :l_type, :short, 0,
           :l_whence, :short, 2,
           :l_start, :off_t, 4,
           :l_len, :off_t, 12,
           :l_sysid, :int, 20,
           :l_pid, :int, 24,
           :l_pad, :int, 28




  end
end
