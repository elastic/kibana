require "routes/base"

module Kibana
  module Routes
    class Home < Base

      get "/" do
        File.read(File.join(ROOT, 'public', 'index.html'))
      end

    end
  end
end
