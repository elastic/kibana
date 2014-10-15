# Add the root of the project to the $LOAD_PATH, For some reason it seems
# to be getting lost when we use warble to make the jar. This fixes it :D
$LOAD_PATH.unshift(Kibana.global_settings[:root])

require "logger"
require "json"
require "lib/JSONLogger"
require "lib/ColorLogger"
require "routes/home"
require "sinatra/json"
require "routes/proxy"

class Logger
  alias_method :write, :<<
end

module Kibana
  class App < Sinatra::Base

    helpers Sinatra::JSON

    configure do
      logger = Logger.new(STDOUT)
      logger.formatter = proc do |severity, datetime, progname, msg|
        data = {
          '@timestamp' => datetime.iso8601,
          :level => severity,
          :name => progname || "Kibana",
          :message => msg
        }
        data.to_json + "\n"
      end
      set :logger, logger
      disable :raise_errors
      disable :show_exceptions
      disable :dump_errors
    end

    configure :production do
      use JSONLogger, settings.logger unless Kibana.global_settings[:quiet]
    end

    configure :quiet do
      set :logger, false
    end

    configure :development do
      use ColorLogger, settings.logger unless Kibana.global_settings[:quiet]
    end

    error do
      500
    end

    error 400 do
      json :status => 500, :message => "Bad Request"
    end

    error 500 do
      json :status => 500, :message => "Internal Server Error"
    end

    not_found do
      json :status => 404, :message => "Not Found"
    end

    # Routes go here
    use Routes::Home
    use Routes::Proxy

  end
end
