
require 'java'

Java::define_exception_handler "java.lang.NumberFormatException" do |e|
  puts e.java_type
  p e.methods
  puts e.java_class.java_method(:getMessage).invoke(e)
end

java.lang.Long.parseLong("23aa")
