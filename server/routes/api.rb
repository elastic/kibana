require "routes/base"
require "lib/helpers"

module Kibana
  module Routes
    class Api < Base

      helpers Kibana::Helpers

      get "/api/foo" do
        json :foo => doSomething()
      end

    end
  end
end
