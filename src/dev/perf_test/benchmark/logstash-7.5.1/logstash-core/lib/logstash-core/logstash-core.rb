# encoding: utf-8

require "java"

# This block is used to load Logstash's Java libraries when using a Ruby entrypoint and
# LS_JARS_LOADED is not globally set.
# Currently this happens when using the `bin/rspec` executable to invoke specs instead of the JUnit
# wrapper.
unless $LS_JARS_LOADED
  jar_path = File.join(File.dirname(File.dirname(__FILE__)), "jars")
  $:.unshift jar_path
  Dir.glob(jar_path + '/*.jar') do |jar|
    require File.basename(jar)
  end
  java_import org.logstash.RubyUtil
end
