require "ffi"
require "rbconfig"

module ChildProcess
  module Windows
    module Lib
      extend FFI::Library

      def self.msvcrt_name
        host_part = RbConfig::CONFIG['host_os'].split("_")[1]
        manifest  = File.join(RbConfig::CONFIG['bindir'], 'ruby.exe.manifest')

        if host_part && host_part.to_i > 80 && File.exists?(manifest)
          "msvcr#{host_part}"
        else
          "msvcrt"
        end
      end

      ffi_lib "kernel32", msvcrt_name
      ffi_convention :stdcall


    end # Library
  end # Windows
end # ChildProcess

require "childprocess/windows/lib"
require "childprocess/windows/structs"
require "childprocess/windows/handle"
require "childprocess/windows/io"
require "childprocess/windows/process_builder"
require "childprocess/windows/process"
