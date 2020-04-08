# this is a generated file, to avoid over-writing it just delete this comment
begin
  require 'jar_dependencies'
rescue LoadError
  require 'com/fasterxml/jackson/module/jackson-module-afterburner/2.9.9/jackson-module-afterburner-2.9.9.jar'
  require 'com/fasterxml/jackson/core/jackson-databind/2.9.9.3/jackson-databind-2.9.9.3.jar'
  require 'com/fasterxml/jackson/core/jackson-core/2.9.9/jackson-core-2.9.9.jar'
  require 'com/fasterxml/jackson/core/jackson-annotations/2.9.9/jackson-annotations-2.9.9.jar'
end

if defined? Jars
  require_jar 'com.fasterxml.jackson.module', 'jackson-module-afterburner', '2.9.9'
  require_jar 'com.fasterxml.jackson.core', 'jackson-databind', '2.9.9.3'
  require_jar 'com.fasterxml.jackson.core', 'jackson-core', '2.9.9'
  require_jar 'com.fasterxml.jackson.core', 'jackson-annotations', '2.9.9'
end
