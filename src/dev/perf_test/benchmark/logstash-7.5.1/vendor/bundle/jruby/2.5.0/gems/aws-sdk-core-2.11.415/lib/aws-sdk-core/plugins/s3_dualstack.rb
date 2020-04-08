module Aws
  module Plugins

    # @api private
    # @seahorse.client.option [Boolean] :use_dualstack_endpoint (false)
    #   When set to `true`, IPv6-compatible bucket endpoints will be used
    #   for all operations.
    class S3Dualstack < Seahorse::Client::Plugin

      option(:use_dualstack_endpoint, false)
      option(:use_accelerate_endpoint, false)

      def add_handlers(handlers, config)
        handlers.add(OptionHandler, step: :initialize)
        handlers.add(DualstackHandler, step: :build, priority: 0)
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
          force_path_style = context.config.force_path_style
          dns_suffix = EndpointProvider.dns_suffix_for(region)

          if use_bucket_dns?(bucket_name, context)
            host = "#{bucket_name}.s3.dualstack.#{region}.#{dns_suffix}"
          else
            host = "s3.dualstack.#{region}.#{dns_suffix}"
          end
          endpoint = URI.parse(context.http_request.endpoint.to_s)
          endpoint.scheme = context.http_request.endpoint.scheme
          endpoint.port = context.http_request.endpoint.port
          endpoint.host = host
          context.http_request.endpoint = endpoint.to_s
        end

        def use_bucket_dns?(bucket_name, context)
          ssl = context.http_request.endpoint.scheme == "https"
          bucket_name && S3BucketDns.dns_compatible?(bucket_name, ssl) &&
            !context.config.force_path_style
        end

        def use_dualstack_endpoint?(context)
          context[:use_dualstack_endpoint] && !context[:use_accelerate_endpoint]
        end
      end

    end
  end
end
