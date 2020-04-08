# encoding: utf-8

raise("JRuby required") unless defined?(JRUBY_VERSION)

lib = File.expand_path('../lib', __FILE__)
$LOAD_PATH.unshift(lib) unless $LOAD_PATH.include?(lib)
require 'jruby_stdin_channel/version'

Gem::Specification.new do |s|
  s.name = "jruby-stdin-channel"
  s.version = StdinChannel::VERSION
  s.authors = ["Colin Surprenant"]
  s.date = Time.now.strftime('%Y-%m-%d')
  s.summary = "JRuby extension to expose an interruptible NIO FileChannel for STDIN"
  s.description = s.summary
  s.email = ["colin.surprenant@gmail.com"]
  s.homepage = "http://github.com/colinsurprenant/jruby-stdin-channel"
  s.require_paths = ["lib"]
  s.licenses = ["Apache-2.0"]
  s.platform = "java"

  s.files = Dir.glob(["jruby-stdin-channel.gemspec", "lib/**/*.{rb,jar}", "src/**/*.java"])

  s.add_development_dependency "rspec", ">= 2.0.0"
  s.add_development_dependency "rake", ">= 10.0.0"
end
