require 'ffi'

module Win32  
  class API < Module
    CONVENTION = FFI::Platform.windows? ? :stdcall : :default

    if RUBY_VERSION =~ /1\.9/
      SUFFIXES = Encoding.default_internal == Encoding::UTF_8 ? [ '', 'W', 'A' ] : [ '', 'A', 'W' ]
    else
      SUFFIXES = $KCODE == 'UTF8' ? [ '', 'W', 'A' ] : [ '', 'A', 'W' ]
    end

    TypeDefs = {
      'V' => :void,
      'S' => :string,
      'P' => :pointer,
      'I' => :int,
      'L' => :long,
    }
    def self.find_type(name)
      code = TypeDefs[name]
      raise TypeError, "Unable to resolve type '#{name}'" unless code
      return code
    end
    def self.map_types(spec)
      types = []
      for i in 0..(spec.length - 1)
        if spec[i].chr == 'V'
          return []
        end
        types[i] = self.find_type(spec.slice(i,1))
      end
      types
    end
    def initialize(func, params, ret='L', lib='kernel32')
      #
      # Attach the method as 'call', so it gets all the froody arity-splitting optimizations
      # 
      extend FFI::Library
      ffi_lib lib
      ffi_convention CONVENTION      
      attached = false
      SUFFIXES.each { |suffix|
        begin
          attach_function(:call, func.to_s + suffix, API.map_types(params), API.map_types(ret)[0])
          attached = true
          break
        rescue FFI::NotFoundError => ex
        end
      }
      raise FFI::NotFoundError, "Could not locate #{func}" if !attached
    end
  end
end
unless FFI::Platform.windows?
  cputs = Win32::API.new("puts", "S", 'L', 'c')
  cputs.call("Hello, World")
  exit 0
end
beep = Win32::API.new("MessageBeep", 'L', 'L', 'user32')
2.times { beep.call(0) }

buf = 0.chr * 260
GetComputerName = Win32::API.new("GetComputerName", 'PP', 'L', 'kernel32')
ret = GetComputerName.call(buf, [buf.length].pack("V"))
puts "GetComputerName returned #{ret}"
puts "computer name=#{buf.strip}"
len = [buf.length].pack('V')
GetUserName = Win32::API.new("GetUserName", 'PP', 'I', 'advapi32')
ret = GetUserName.call(buf, len)
puts "GetUserName returned #{ret}"
puts "username=#{buf.strip}"
puts "len=#{len.unpack('V')}"
getcwd = Win32::API.new("GetCurrentDirectory", 'LP')
buf = 0.chr * 260
getcwd.call(buf.length, buf)
puts "current dir=#{buf.strip}"

