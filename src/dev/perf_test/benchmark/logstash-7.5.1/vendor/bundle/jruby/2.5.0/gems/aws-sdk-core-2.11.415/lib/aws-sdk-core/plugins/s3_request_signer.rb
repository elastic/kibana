require 'set'

module Aws
  module Plugins
    # This plugin is an implementation detail and may be modified.
    # @api private
    class S3RequestSigner < Seahorse::Client::Plugin

      option(:signature_version, 'v4')

      class SigningHandler < RequestSigner::Handler

        def call(context)
          require_credentials(context)
          version = context.config.signature_version
          case version
          when 'v4' then apply_v4_signature(context)
          when 's3' then apply_s3_legacy_signature(context)
          else
            raise "unsupported signature version #{version.inspect}, valid"\
              " options: 'v4' (default), 's3'"
          end
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

      # This handler will update the http endpoint when the bucket region
      # is known/cached.
      class CachedBucketRegionHandler < Handler

        def call(context)
          if bucket = context.params[:bucket]
            use_regional_endpoint_when_known(context, bucket)
          end
          @handler.call(context)
        end

        private

        def use_regional_endpoint_when_known(context, bucket)
          cached_region = S3::BUCKET_REGIONS[bucket]
          if cached_region && cached_region != context.config.region
            context.http_request.endpoint.host = new_hostname(context, cached_region)
            context[:cached_sigv4_region] = cached_region
            context[:cached_signature_version] = :v4
          end
        end

      end

      # This handler detects when a request fails because of a mismatched bucket
      # region. It follows up by making a request to determine the correct
      # region, then finally a version 4 signed request against the correct
      # regional endpoint.
      class BucketRegionErrorHandler < Handler

        def call(context)
          response = @handler.call(context)
          handle_region_errors(response)
        end

        private

        def handle_region_errors(response)
          if wrong_sigv4_region?(response)
            get_region_and_retry(response.context)
          else
            response
          end
        end

        def get_region_and_retry(context)
          actual_region = context.http_response.headers['x-amz-bucket-region']
          actual_region ||= region_from_body(context.http_response.body_contents)
          update_bucket_cache(context, actual_region)
          log_warning(context, actual_region)
          update_region_header(context, actual_region)
          @handler.call(context)
        end

        def update_bucket_cache(context, actual_region)
          S3::BUCKET_REGIONS[context.params[:bucket]] = actual_region
        end

        def wrong_sigv4_region?(resp)
          resp.context.http_response.status_code == 400 &&
          (
            resp.context.http_response.headers['x-amz-bucket-region'] ||
            resp.context.http_response.body_contents.match(/<Region>.+?<\/Region>/)
          )
        end

        def update_region_header(context, region)
          context.http_response.body.truncate(0)
          context.http_request.headers.delete('authorization')
          context.http_request.headers.delete('x-amz-security-token')
          context.http_request.endpoint.host = new_hostname(context, region)
          signer = Signers::V4.new(context.config.credentials, 's3', region)
          signer.sign(context.http_request)
        end

        def region_from_body(body)
          region = body.match(/<Region>(.+?)<\/Region>/)[1]
          if region.nil? || region == ""
            raise "couldn't get region from body: #{body}"
          else
            region
          end
        end

        def log_warning(context, actual_region)
          msg = "S3 client configured for #{context.config.region.inspect} " +
            "but the bucket #{context.params[:bucket].inspect} is in " +
            "#{actual_region.inspect}; Please configure the proper region " +
            "to avoid multiple unnecessary redirects and signing attempts\n"
          if logger = context.config.logger
            logger.warn(msg)
          else
            warn(msg)
          end
        end

      end

      # BEFORE signing
      handle(CachedBucketRegionHandler, step: :sign, priority: 60)

      # sign the request
      handler(SigningHandler, step: :sign)

      # AFTER signing
      handle(BucketRegionErrorHandler, step: :sign, priority: 40)

    end
  end
end
