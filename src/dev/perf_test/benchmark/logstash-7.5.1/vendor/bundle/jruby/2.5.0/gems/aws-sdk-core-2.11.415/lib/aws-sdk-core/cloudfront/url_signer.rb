require 'base64'
require 'uri'
require 'time'
require 'json'
require 'openssl'

module Aws
  module CloudFront

    # Allows you to create signed URLs for Amazon CloudFront resources
    #
    #     signer = Aws::CloudFront::UrlSigner.new(
    #       key_pair_id: "cf-keypair-id",
    #       private_key_path: "./cf_private_key.pem"
    #     )
    #     url = signer.signed_url(url,
    #       policy: policy.to_json
    #     )
    #
    class UrlSigner
      include Signer

      # create a signed Amazon CloudFront URL
      # @param [String] url
      # @option params [Time, DateTime, Date, String, Integer<timestamp>] :expires
      # @option params [String<JSON>] :policy
      def signed_url(url, params = {})
        scheme, uri = scheme_and_uri(url)
        signed_content = signature(
          resource: resource(scheme, uri),
          expires: time(params[:expires]),
          policy: params[:policy]
        )

        start_flag = URI.parse(uri).query ? '&' : '?'
        signature = signed_content.map{ |k, v| "#{k}=#{v}" }.join('&').gsub("\n", '')
        uri = "#{uri}#{start_flag}#{signature}"

        if scheme == 'rtmp'
          rtmp_url(URI(uri))
        else
          uri
        end
      end

    end
  end
end
