module Aws
  module Plugins
    class S3ControlDns < Seahorse::Client::Plugin
      def add_handlers(handlers, config)
        handlers.add(Handler, step: :build, priority: 1)
      end

      class Handler < Seahorse::Client::Handler
        def call(context)
          if context.operation.endpoint_pattern.nil?
            move_account_id_to_subdomain(context)
          end
          @handler.call(context)
        end

        private
        def move_account_id_to_subdomain(context)
          account_id = context.params[:account_id]
          endpoint = context.http_request.endpoint
          endpoint.host = "#{account_id}.#{endpoint.host}"
        end
      end
    end
  end
end
