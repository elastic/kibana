module Aws
  module Plugins
    class ResponsePaging < Seahorse::Client::Plugin

      def add_handlers(handlers, config)
        handlers.add(Handler,
          operations: pageable_operations(config),
          step: :initialize,
          priority: 90)
      end

      private

      def pageable_operations(config)
        config.api.operations.inject([]) do |pageable, (name, operation)|
          pageable << name if operation[:pager]
          pageable
        end
      end

      # @api private
      class Handler < Seahorse::Client::Handler

        def call(context)
          context[:original_params] = context.params
          resp = @handler.call(context)
          resp.extend(PageableResponse)
          resp.pager = context.operation[:pager]
          resp
        end

      end
    end
  end
end
