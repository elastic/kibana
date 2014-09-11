require "rubygems"
require "bundler/setup"

ROOT = File.expand_path("#{File.dirname(__FILE__)}/../")

if ENV['RACK_ENV'] == ('development')
  PUBLIC_ROOT = File.expand_path("#{File.dirname(__FILE__)}/../../kibana/")
  CONFIG_PATH = File.expand_path("#{File.dirname(__FILE__)}/kibana.yml")
end

if ENV['RACK_ENV'] == ('production')
  PUBLIC_ROOT = File.expand_path("#{File.dirname(__FILE__)}/../public/")
  CONFIG_PATH = ENV["CONFIG_PATH"]
end

$LOAD_PATH.unshift(ROOT)

# Require the application
require "#{ROOT}/lib/app"

# Run the application
run Kibana::App
