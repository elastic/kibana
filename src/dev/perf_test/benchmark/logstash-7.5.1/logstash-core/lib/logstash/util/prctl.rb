# encoding: utf-8
module LibC
  require "ffi"
  extend FFI::Library
  ffi_lib 'c'

  # Ok so the 2nd arg isn't really a string... but whatever
  attach_function :prctl, [:int, :string, :long, :long, :long], :int
end

