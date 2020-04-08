require 'cgi'

module AWS
  class S3
    # @api private
    module RegionDetection

      private

      def retry_server_errors(&block)
        response = super
        if requires_sigv4?(response)
          detect_region_and_retry(response, &block)
        else
          response
        end
      end

      def requires_sigv4?(resp)
        resp.http_response.status == 400 &&
        resp.http_response.body &&
        resp.http_response.body.include?('Please use AWS4-HMAC-SHA256')
      end

      def detect_region_and_retry(response, &retry_block)
        updgrade_to_v4(response, 'us-east-1')
        yield
        return if response.http_response.status == 200
        actual_region = region_from_location_header(response)
        updgrade_to_v4(response, actual_region)
        log_region_warning(response, actual_region)
        yield
      end

      def updgrade_to_v4(response, region)
        bucket = response.request_options[:bucket_name]
        if response.http_request.body_stream.respond_to?(:rewind)
          response.http_request.body_stream.rewind
        end
        response.http_request.headers.delete('authorization')
        response.http_request.headers.delete('x-amz-security-token')
        response.http_request.host = new_hostname(response, region)
        new_v4_signer(region).sign_request(response.http_request)
      end

      def region_from_location_header(response)
        location = response.http_response.headers['location'].first
        location.match(/s3\.(.+?)\.amazonaws\.com/)[1]
      end

      def new_v4_signer(region)
        Core::Signers::Version4.new(credential_provider, 's3', region)
      end

      def new_hostname(response, region)
        bucket = response.request_options[:bucket_name]
        if region == 'us-east-1'
          's3-external-1.amazonaws.com'
        else
          "s3.#{region}.amazonaws.com"
        end
      end

      def log_region_warning(response, actual_region)
        bucket_name = response.request_options[:bucket_name]
        S3::BUCKET_REGIONS[bucket_name] = actual_region
        log_warning("S3 client configured for #{@region.inspect} " +
          "but the bucket #{bucket_name.inspect} is in" +
          "#{actual_region.inspect}; Please configure the proper region " +
          "to avoid multiple unecessary redirects and signing attempts\n")
      end

    end
  end
end
