module Aws
  module Plugins 
 
    # CloudSearchDomain has query length limits for #search in GET
    # Convert #search operation request from GET to POST
    class CSDSwitchToPost < Seahorse::Client::Plugin

      # @api private
      class Handler < Seahorse::Client::Handler

        def call(context)
          convert_get_2_post(context)
          @handler.call(context)
        end

        private

        def convert_get_2_post(context)
          context.http_request.http_method = 'POST'
          uri = context.http_request.endpoint
          context.http_request.body = uri.query
          context.http_request.headers['Content-Length'] = uri.query.length
          context.http_request.headers['Content-Type'] = 'application/x-www-form-urlencoded'
          context.http_request.endpoint.query = nil
        end

      end

      handler(
        Handler,
        step: :build,
        operations: [:search]
      )
    end
  end
end
