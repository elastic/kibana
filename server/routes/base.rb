require "sinatra/base"
require "sinatra/json"

module Kibana
  module Routes
    class Base < Sinatra::Base
      helpers Sinatra::JSON

      configure do
        # Confirgure stuffs here
      end

    end
  end
end
