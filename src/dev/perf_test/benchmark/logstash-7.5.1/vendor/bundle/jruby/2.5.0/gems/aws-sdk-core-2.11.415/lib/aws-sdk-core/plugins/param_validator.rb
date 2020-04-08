module Aws
  module Plugins

    # @seahorse.client.option [Boolean] :validate_params (true)
    #   When `true`, request parameters are validated before
    #   sending the request.
    class ParamValidator < Seahorse::Client::Plugin

      option(:validate_params, true)

      def add_handlers(handlers, config)
        if config.validate_params
          handlers.add(Handler, step: :validate, priority: 50)
        end
      end

      class Handler < Seahorse::Client::Handler

        def call(context)
          Aws::ParamValidator.validate!(context.operation.input, context.params)
          @handler.call(context)
        end

      end

    end
  end
end
