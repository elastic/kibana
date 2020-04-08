# encoding: utf-8
$LOAD_PATH.unshift(File.expand_path(File.join(__FILE__, "..", "..")))

require "bootstrap/environment"

ENV["GEM_HOME"] = ENV["GEM_PATH"] = LogStash::Environment.logstash_gem_home
Gem.use_paths(LogStash::Environment.logstash_gem_home)

#libdir = File.expand_path("../lib", File.dirname(__FILE__))
#$LOAD_PATH << libdir if File.exist?(File.join(libdir, "pleaserun", "cli.rb"))
require "pleaserun/cli"
exit(PleaseRun::CLI.run || 0)
