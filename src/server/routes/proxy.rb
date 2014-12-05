require "routes/base"
require "rack/reverse_proxy"

module Kibana
  module Routes
    class Proxy < Base
      # Rack middleware goes here
      config = settings.config
      use Rack::ReverseProxy do
        reverse_proxy_options timeout: config["request_timeout"]
        @global_options[:verify_ssl] = config["verify_ssl"].nil? ? true : config["verify_ssl"]
        reverse_proxy(/^\/elasticsearch(.*)$/, "#{config["elasticsearch"]}$1",
            username: config["elasticsearch_username"],
            password: config["elasticsearch_password"],
            preserve_host: config["elasticsearch_preserve_host"].nil? ? true : config["elasticsearch_preserve_host"])
      end
    end
  end
end
