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

        plugins = external_plugins.concat(bundled_plugins)
        data['plugins'] = plugins

        json data
      end

      private

        def external_plugins
          plugins_ids_in(settings.external_plugins_folder)
        end

        def bundled_plugins
          plugins_ids_in(settings.bundled_plugins_folder)
        end

        def plugins_ids_in(dir)
          if dir
            indexes = Dir.glob(File.join(dir, '*', 'index.js'))
          else
            indexes = []
          end

          indexes.map { |path| path.sub(dir, 'plugins').sub(/\.js$/, '') }
        end

    end
  end
end
