if ENV['RACK_ENV'] == ('development')
  ROOT = File.expand_path("#{File.dirname(__FILE__)}/../")
  PUBLIC_ROOT = File.expand_path("#{File.dirname(__FILE__)}/../../kibana/")
  CONFIG_PATH = File.expand_path("#{File.dirname(__FILE__)}/kibana.yml")
end

if ENV['RACK_ENV'] == ('production')
  ROOT = File.expand_path("#{File.dirname(__FILE__)}/../")
  PUBLIC_ROOT = File.expand_path("#{File.dirname(__FILE__)}/../public/")
  CONFIG_PATH = ENV["CONFIG_PATH"]
end

print ENV;

$LOAD_PATH.unshift(ROOT)

require "rubygems"
require "bundler/setup"

# Require the application
require "#{ROOT}/lib/app"

# Run the application
run Kibana::App
