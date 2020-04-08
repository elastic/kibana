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
  module Core
    module Signers
      # @api private
      class S3

        SUB_RESOURCES = %w(
          acl location logging notification partNumber policy
          requestPayment torrent uploadId uploads versionId
          versioning versions restore delete lifecycle tagging cors
          website
        )

        QUERY_PARAMS = %w(
          response-content-type response-content-language
          response-expires response-cache-control
          response-content-disposition response-content-encoding
        )

        # @param [CredentialProviders::Provider] credentials
        def initialize credentials
          @credentials = credentials
        end

        # @return [CredentialProviders::Provider]
        attr_reader :credentials

        # @param [Http::Request] req
        # @return [Http::Request]
        def sign_request req
          if token = credentials.session_token
            req.headers["x-amz-security-token"] = token
          end
          req.headers["authorization"] = authorization(req)
        end

        private

        def authorization req
          "AWS #{credentials.access_key_id}:#{signature(req)}"
        end

        def signature req
          secret = credentials.secret_access_key
          signature = self.class.string_to_sign(req)
          signature = Base.sign(credentials.secret_access_key, signature, 'sha1')
          URI.escape(signature)
        end

        class << self

          # From the S3 developer guide:
          #
          #     StringToSign =
          #       HTTP-Verb ` "\n" `
          #       content-md5 ` "\n" `
          #       content-type ` "\n" `
          #       date ` "\n" `
          #       CanonicalizedAmzHeaders + CanonicalizedResource;
          #
          def string_to_sign req
            [
              req.http_method,
              req.headers.values_at('content-md5', 'content-type').join("\n"),
              signing_string_date(req),
              canonicalized_headers(req),
              canonicalized_resource(req),
            ].flatten.compact.join("\n")
          end

          def signing_string_date req
            # if a date is provided via x-amz-date then we should omit the
            # Date header from the signing string (should appear as a blank line)
            if req.headers.detect{|k,v| k.to_s =~ /^x-amz-date$/i }
              ''
            else
              req.headers['date'] ||= Time.now.httpdate
            end
          end

          # CanonicalizedAmzHeaders
          #
          # See the developer guide for more information on how this element
          # is generated.
          #
          def canonicalized_headers req
            x_amz = req.headers.select{|k, v| k.to_s =~ /^x-amz-/i }
            x_amz = x_amz.collect{|k, v| [k.downcase, v] }
            x_amz = x_amz.sort_by{|k, v| k }
            x_amz = x_amz.collect{|k, v| "#{k}:#{v.to_s.strip}" }.join("\n")
            x_amz == '' ? nil : x_amz
          end

          # From the S3 developer guide
          #
          #     CanonicalizedResource =
          #       [ "/" ` Bucket ] `
          #       <HTTP-Request-URI, protocol name up to the querystring> +
          #       [ sub-resource, if present. e.g. "?acl", "?location",
          #       "?logging", or "?torrent"];
          #
          # @api private
          def canonicalized_resource req

            parts = []

            # virtual hosted-style requests require the hostname to appear
            # in the canonicalized resource prefixed by a forward slash.
            if
              AWS::S3::Client.dns_compatible_bucket_name?(req.bucket) and
              !req.path_style?
            then
              parts << "/#{req.bucket}"
            end

            # all requests require the portion of the un-decoded uri up to
            # but not including the query string
            parts << req.path

            # lastly any sub resource querystring params need to be appened
            # in lexigraphical ordered joined by '&' and prefixed by '?'
            params =
              sub_resource_params(req) +
              query_parameters_for_signature(req)

            unless params.empty?
              parts << '?'
              parts << params.sort.collect{|p| p.to_s }.join('&')
            end

            parts.join
          end

          def sub_resource_params req
            req.params.select{|p| SUB_RESOURCES.include?(p.name) }
          end

          def query_parameters_for_signature req
            req.params.select { |p| QUERY_PARAMS.include?(p.name) }
          end

        end
      end
    end
  end
end
