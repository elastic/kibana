# Add the root of the project to the $LOAD_PATH, For some reason it seems
# to be getting lost when we use warble to make the jar. This fixes it :D
$LOAD_PATH.unshift(ROOT)

require "rack/reverse_proxy"
require "routes/home"
require "routes/api"

module Kibana
  class App < Sinatra::Base

    configure do
      set :root, ROOT
      set :public_folder, "#{ROOT}/public"
      set :httponly, true
    end

    # Rack middleware goes here
    use Rack::ReverseProxy do
      reverse_proxy /^\/elasticsearch(.*)$/, 'http://localhost:9200$1'
    end

    # Routes go here
    use Routes::Home
    use Routes::Api
  end
end
