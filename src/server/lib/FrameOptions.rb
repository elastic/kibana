# This monkeypatch is needed to ensure the X-Frame-Options header is
# never set by rack-protection.
#
# http://stackoverflow.com/a/19232793/296172
#
module Rack
  module Protection
    class FrameOptions < Base
      def call(env)
        @app.call(env)
      end
    end
  end
end