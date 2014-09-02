require "sinatra/base"
require "sinatra/json"
require "yaml"

module Kibana
  module Routes
    class Base < Sinatra::Base
      helpers Sinatra::JSON
      configure do
        set :root, ENV['KIBANA_ROOT']
        set :public_folder, ENV['PUBLIC_ROOT']
        set :httponly, true

        config = YAML.load(IO.read(ENV['CONFIG_PATH']))
        set :config, config
        config['elasticsearch'] = ENV['KIBANA_ELASTICSEARCH']
        config['port'] = ENV['KIBANA_PORT'].to_i
      end
    end
  end
end
