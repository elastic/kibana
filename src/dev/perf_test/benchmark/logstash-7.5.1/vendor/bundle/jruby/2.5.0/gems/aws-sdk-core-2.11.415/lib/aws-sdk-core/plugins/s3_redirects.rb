module Aws
  module Plugins

    # @seahorse.client.option [Boolean] :follow_redirects (true)
    #   When `true`, this client will follow 307 redirects returned
    #   by Amazon S3.
    class S3Redirects < Seahorse::Client::Plugin

      option(:follow_redirects, true)

      # @api private
      class Handler < Seahorse::Client::Handler

        def call(context)
          response = @handler.call(context)
          if context.http_response.status_code == 307
            endpoint = context.http_response.headers['location']
            context.http_request.endpoint = endpoint
            context.http_response.body.truncate(0)
            @handler.call(context)
          else
            response
          end
        end

      end

      def add_handlers(handlers, config)
        if config.follow_redirects
          # we want to re-trigger request signing
          handlers.add(Handler, step: :sign, priority: 90)
        end
      end

    end
  end
end
