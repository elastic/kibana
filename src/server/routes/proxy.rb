require "routes/base"
require "rack/reverse_proxy"

module Kibana
  module Routes
    class Proxy < Base
      # Rack middleware goes here
      config = settings.config
      use Rack::ReverseProxy do
        reverse_proxy_options timeout: config["request_timeout"]
        @global_options[:verify_ssl] = config["verifySSL"].nil? ? true : config["verifySSL"]
        reverse_proxy(/^\/elasticsearch(.*)$/, "#{config["elasticsearch"]}$1")
      end
    end
  end
end
