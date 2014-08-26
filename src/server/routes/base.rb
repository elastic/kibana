require "sinatra/base"
require "sinatra/json"
require "yaml"


module Kibana
  module Routes
    class Base < Sinatra::Base

      helpers Sinatra::JSON
      configure do
        set :root, ROOT
        set :public_folder, PUBLIC_ROOT
        set :httponly, true

        config = YAML.load(IO.read(CONFIG_PATH))
        set :config, config
      end

    end
  end
end
