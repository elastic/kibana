# Add the libs directory to the load path
ROOT = File.expand_path("#{File.dirname(__FILE__)}/../")
$LOAD_PATH.unshift(ROOT)

require "rubygems"
require "bundler/setup"

# Require the application
require "#{ROOT}/lib/app"

# Run the application
run Kibana::App
