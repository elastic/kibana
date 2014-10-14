require "routes/base"

module Kibana
  module Routes
    class Plugins < Base

      use Rack::Static, :urls => ["/plugins"], :root => File.expand_path("#{settings.plugin_folder}/..")

    end
  end
end
