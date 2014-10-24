require "routes/base"
require "lib/MultiStatic"

module Kibana
  module Routes
    class Plugins < Base
      use Kibana::MultiStatic,
        prefix: '/plugins/',
        paths: [
          settings.bundled_plugins_folder,
          settings.external_plugins_folder
        ].compact
    end
  end
end