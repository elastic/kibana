# Copyright 2011-2013 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# Licensed under the Apache License, Version 2.0 (the "License"). You
# may not use this file except in compliance with the License. A copy of
# the License is located at
#
#     http://aws.amazon.com/apache2.0/
#
# or in the "license" file accompanying this file. This file is
# distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF
# ANY KIND, either express or implied. See the License for the specific
# language governing permissions and limitations under the License.

module AWS
  class S3

    # Utility class for building pre-signed URLs for Amazon S3 objects using
    # signature version 4.
    class PresignV4

      # @param [S3Object] object
      def initialize(object)
        @object = object
        @client = object.client
        @signer = object.client.send(:v4_signer)
      end

      # @return [S3Object]
      attr_reader :object

      # @return [Client]
      attr_reader :client

      # @return [Core::Signers::Version4]
      attr_reader :signer

      # @param (see S3Object#url_for)
      # @option (see S3Object#url_for)
      # @return (see S3Object#url_for)
      def presign(method, options = {})

        now = Time.now.utc
        one_week = 60 * 60 * 24 * 7
        if options[:expires] - now.to_i > one_week
          msg = "presigned URLs using sigv4 may not expire more than one week out"
          raise ArgumentError, msg
        end

        now = now.strftime("%Y%m%dT%H%M%SZ")

        request = build_request(method, options)

        request.headers.clear
        request.headers['host'] = request.host
        signed_headers = 'Host'

        if options[:acl]
          request.add_param("x-amz-acl", options[:acl].to_s.gsub(/_/, '-'))
        end

        # must be sent along with the PUT request headers
        if options[:content_md5]
          request.headers['Content-MD5'] = options[:content_md5]
          signed_headers << ';Content-MD5'
        end

        request_params = Core::Signers::S3::QUERY_PARAMS.map do |p|
          param = p.tr("-","_").to_sym
          if options.key?(param)
            request.add_param(p, options[param])
          end
        end

        token = client.credential_provider.session_token

        request.add_param("X-Amz-Algorithm", "AWS4-HMAC-SHA256")
        request.add_param("X-Amz-Date", now)
        request.add_param("X-Amz-SignedHeaders", signed_headers)
        request.add_param("X-Amz-Expires", seconds_away(options[:expires]))
        request.add_param('X-Amz-Security-Token', token) if token
        request.add_param("X-Amz-Credential", signer.credential(now))
        request.add_param("X-Amz-Signature", signature(request, now))

        build_uri(request, options)

      end

      private

      def build_request(method, options)
        path_style = object.config.s3_force_path_style
        params = options.merge(
          :bucket_name => object.bucket.name,
          :key => object.key,
          :data => ''
        )
        req = client.send(:build_request, operation_name(method), params)
        req.force_path_style = options.fetch(:force_path_style, path_style)
        req
      end

      def operation_name(method)
        case method
        when :get, :read then :get_object
        when :put, :write then :put_object
        when :delete then :delete_object
        when :head then :head_object
        else
          msg = "invalid method, expected :get, :put or :delete, got "
          msg << method.inspect
          raise ArgumentError msg
        end
      end

      def signature(request, datetime)
        key = signer.derive_key(datetime)
        signer.signature(request, key, datetime, 'UNSIGNED-PAYLOAD')
      end

      def build_uri(request, options)
        uri_class = options[:secure] ? URI::HTTPS : URI::HTTP
        uri_class.build(
          :host => request.host,
          :port => request.port,
          :path => request.path,
          :query => request.querystring
        )
      end

      def seconds_away(expires)
        expires - Time.now.to_i
      end

    end
  end
end
