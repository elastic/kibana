require "java"

Dir["#{File.expand_path('..', __FILE__)}/snappy-*.jar"].each { |jar| require(jar) }
