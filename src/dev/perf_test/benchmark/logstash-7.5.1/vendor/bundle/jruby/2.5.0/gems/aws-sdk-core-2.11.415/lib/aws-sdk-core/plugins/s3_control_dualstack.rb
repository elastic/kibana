module Aws
  module Plugins
    # @api private
    class S3ControlDualstack < Seahorse::Client::Plugin
      option(:use_dualstack_endpoint, false)

        def add_handlers(handlers, config)
          handlers.add(OptionHandler, step: :initialize)
          handlers.add(DualstackHandler, step: :build, priority: 2)
        end

        # @api private
        class OptionHandler < Seahorse::Client::Handler
          def call(context)
            dualstack = context.params.delete(:use_dualstack_endpoint)
            dualstack = context.config.use_dualstack_endpoint if dualstack.nil?
            context[:use_dualstack_endpoint] = dualstack
            @handler.call(context)
          end
        end

        # @api private
        class DualstackHandler < Seahorse::Client::Handler
          def call(context)
            apply_dualstack_endpoint(context) if use_dualstack_endpoint?(context)
            @handler.call(context)
          end

          private
          def apply_dualstack_endpoint(context)
            bucket_name = context.params[:bucket]
            region = context.config.region
            dns_suffix = EndpointProvider.dns_suffix_for(region)
            host = "s3-control.dualstack.#{region}.#{dns_suffix}"
            endpoint = URI.parse(context.http_request.endpoint.to_s)
            endpoint.scheme = context.http_request.endpoint.scheme
            endpoint.port = context.http_request.endpoint.port
            endpoint.host = host
            context.http_request.endpoint = endpoint.to_s
          end

          def use_dualstack_endpoint?(context)
            context[:use_dualstack_endpoint]
          end
        end
    end
  end
end
