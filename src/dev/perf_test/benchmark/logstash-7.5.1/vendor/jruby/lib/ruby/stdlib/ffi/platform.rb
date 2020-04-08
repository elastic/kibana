# Load built-in ffi-internal library
JRuby::Util.load_ext("org.jruby.ext.ffi.FFIService")

module FFI
  module Platform
    #
    # Most of the constants are now defined in org.jruby.ext.ffi.Platform.java
    #
    FFI_DIR = File.dirname(__FILE__)
    CONF_DIR = File.join(FFI_DIR, "platform", NAME)
  end
end
