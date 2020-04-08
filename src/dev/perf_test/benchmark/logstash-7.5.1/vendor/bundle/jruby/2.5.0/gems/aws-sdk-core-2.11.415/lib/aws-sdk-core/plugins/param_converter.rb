module Aws
  module Plugins

    # @seahorse.client.option [Boolean] :convert_params (true)
    #   When `true`, an attempt is made to coerce request parameters
    #   into the required types.
    class ParamConverter < Seahorse::Client::Plugin

      option(:convert_params, true)

      def add_handlers(handlers, config)
        handlers.add(Handler, step: :initialize) if config.convert_params
      end

      class Handler < Seahorse::Client::Handler

        def call(context)
          converter = Aws::ParamConverter.new(context.operation.input)
          context.params = converter.convert(context.params)
          @handler.call(context).on_complete do |resp|
            converter.close_opened_files
          end
        end

      end
    end
  end
end
