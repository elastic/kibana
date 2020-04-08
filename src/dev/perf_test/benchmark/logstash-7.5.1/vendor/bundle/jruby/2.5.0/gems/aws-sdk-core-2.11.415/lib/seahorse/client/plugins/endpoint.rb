module Seahorse
  module Client
    module Plugins
      # @seahorse.client.option [String] :endpoint
      #    The HTTP or HTTPS endpoint to send requests to.
      #    For example:
      #
      #        'http://example.com'
      #        'https://example.com'
      #        'http://example.com:123'
      #
      class Endpoint < Plugin

        option(:endpoint)

        def add_handlers(handlers, config)
          handlers.add(Handler, priority: 90)
        end

        def after_initialize(client)

          endpoint = client.config.endpoint
          if endpoint.nil?
            msg = "missing required option `:endpoint'"
            raise ArgumentError, msg
          end

          endpoint = URI.parse(endpoint.to_s)
          if URI::HTTPS === endpoint or URI::HTTP === endpoint
            client.config.endpoint = endpoint
          else
            msg = 'expected :endpoint to be a HTTP or HTTPS endpoint'
            raise ArgumentError, msg
          end
        end

        class Handler < Client::Handler

          def call(context)
            context.http_request.endpoint = URI.parse(context.config.endpoint.to_s)
            @handler.call(context)
          end

        end
      end
    end
  end
end
