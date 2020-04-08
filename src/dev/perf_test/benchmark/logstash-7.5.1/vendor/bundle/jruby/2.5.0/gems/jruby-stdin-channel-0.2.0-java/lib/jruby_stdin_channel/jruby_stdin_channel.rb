# encoding: utf-8

require "java"

# local dev setup
classes_dir = File.expand_path("../../../out/production/main", __FILE__)

if File.directory?(classes_dir)
  # if in local dev setup, add to classpath
  $CLASSPATH << classes_dir unless $CLASSPATH.include?(classes_dir)
else
  # otherwise use included jar
  require "jruby_stdin_channel/jruby_stdin_channel.jar"
end

module StdinChannel
  class ClosedChannelError < StandardError
  end
end

require "stdin_channel"
require "jruby_stdin_channel/version"