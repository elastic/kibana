require 'set'

module Aws
  module Plugins
    # This plugin is an implementation detail and may be modified.
    # @api private
    class S3ControlSigner < Seahorse::Client::Plugin

      class SigningHandler < RequestSigner::Handler

        def call(context)
          require_credentials(context)
          version = context.config.signature_version
          apply_v4_signature(context)
          @handler.call(context)
        end

        private

        def apply_v4_signature(context)
          Signers::V4.new(
            context.config.credentials, 's3',
            context[:cached_sigv4_region] || context.config.sigv4_region,
          ).sign(context.http_request)
        end

        def apply_s3_legacy_signature(context)
          Signers::S3.sign(context)
        end

      end

      # Abstract base class for the other two handlers
      class Handler < Seahorse::Client::Handler

        private

        def new_hostname(context, region)
          bucket = context.params[:bucket]
          if region == 'us-east-1'
            "#{bucket}.s3.amazonaws.com"
          else
            bucket + '.' + URI.parse(EndpointProvider.resolve(region, 's3')).host
          end
        end

      end

      # sign the request
      handler(SigningHandler, step: :sign)
    end
  end
end
