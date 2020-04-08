module Aws
  module Plugins
    # @api private
    class APIGatewayHeader < Seahorse::Client::Plugin

      class Handler < Seahorse::Client::Handler

        def call(context)
          context.http_request.headers['Accept'] = 'application/json'
          @handler.call(context)
        end

      end

      handler(Handler)

    end
  end
end
