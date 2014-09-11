require "sinatra/base"
require "sinatra/json"
require "yaml"

module Kibana
  module Routes
    class Base < Sinatra::Base
      helpers Sinatra::JSON
      configure do
        config = Kibana.global_settings[:config].clone()
        config['elasticsearch'] = Kibana.global_settings[:elasticsearch]
        config['port'] = Kibana.global_settings[:port].to_i

        set :root, Kibana.global_settings[:root]
        set :public_folder, Kibana.global_settings[:public_folder]
        set :httponly, true
        set :config, config
      end
    end
  end
end
