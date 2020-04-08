require 'puma/detect'

if Puma::IS_JRUBY
  require 'puma/java_io_buffer'
else
  require 'puma/puma_http11'
end
