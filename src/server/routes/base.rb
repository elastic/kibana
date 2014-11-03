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
        puts Kibana.global_settings[:timeout]
        config['request_timeout'] = Kibana.global_settings[:request_timeout]
        config['shard_timeout'] = Kibana.global_settings[:shard_timeout]



        set :root, Kibana.global_settings[:root]
        set :public_folder, Kibana.global_settings[:public_folder]
        set :bundled_plugins_folder, Kibana.global_settings[:bundled_plugins_folder]
        set :external_plugins_folder, Kibana.global_settings[:external_plugins_folder]
        set :httponly, true
        set :config, config
        set :bundled_plugin_ids, config['bundledPluginIds'] || []
      end
    end
  end
end
