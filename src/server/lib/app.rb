# Add the root of the project to the $LOAD_PATH, For some reason it seems
# to be getting lost when we use warble to make the jar. This fixes it :D
$LOAD_PATH.unshift(ROOT)

require "rack/reverse_proxy"
require "routes/home"
require "routes/proxy"

module Kibana
  class App < Sinatra::Base

    # Routes go here
    use Routes::Home
    use Routes::Proxy
  end
end
