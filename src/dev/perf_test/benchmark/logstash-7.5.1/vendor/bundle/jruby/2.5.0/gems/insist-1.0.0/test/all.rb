require "rubygems"
require "minitest/spec"
require "minitest/autorun"

# Get coverage report
require "simplecov"
SimpleCov.start

# Add '../lib' to the require path.
$: << File.join(File.dirname(__FILE__), "..", "lib")

def use(path)
  puts "Loading tests from #{path}"
  require File.expand_path(path)
end

dirname = File.dirname(__FILE__)
use File.join(dirname, "docs.rb")

# Load tests from ./*/**/*.rb (usually ./libraryname/....)
glob = File.join(dirname, "*", "**", "*.rb")
Dir.glob(glob).each do |path|
  use path
end
