require "routes/base"

module Kibana
  module Routes
    class Home < Base

      get "/" do
        File.read(File.join(settings.public_folder, 'index.html'))
      end

      get "/config" do
        # Clone the settings object and change the elasticsearch attribute
        # to the proxy for elasticsearch
        data = settings.config.clone()
        data['elasticsearch'] = "#{request.scheme}://#{request.host}:#{request.port}/elasticsearch"
        json data
      end

    end
  end
end
