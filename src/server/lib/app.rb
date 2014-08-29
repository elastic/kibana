# Add the root of the project to the $LOAD_PATH, For some reason it seems
# to be getting lost when we use warble to make the jar. This fixes it :D
$LOAD_PATH.unshift(ENV['KIBANA_ROOT'])

require "logger"
require "routes/home"
require "routes/proxy"
require "json"
require "lib/JSONLogger"

class Logger
  alias_method :write, :<<
end

module Kibana
  class App < Sinatra::Base
    configure do
      logger = Logger.new(STDOUT)
      use JSONLogger, logger
    end
    # Routes go here
    use Routes::Home
    use Routes::Proxy
  end
end
