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

require 'openssl'
require 'time'

module AWS
  module Core
    module Signers
      # @api private
      class Version3

        include Base

        # @param [CredentialProviders::Provider] credentials
        def initialize credentials
          @credentials = credentials
        end

        # @return [CredentialProviders::Provider]
        attr_reader :credentials

        # @param [Http::Request] req
        # @return [Http::Request]
        def sign_request req
          req.headers["x-amz-date"] ||= (req.headers["date"] ||= Time.now.httpdate)
          req.headers["host"] ||= req.host
          req.headers["x-amz-security-token"] = credentials.session_token if
            credentials.session_token
          req.headers["x-amzn-authorization"] =
            "AWS3 "+
            "AWSAccessKeyId=#{credentials.access_key_id},"+
            "Algorithm=HmacSHA256,"+
            "SignedHeaders=#{headers_to_sign(req).join(';')},"+
            "Signature=#{signature(req)}"
        end

        private

        # @param [Http::Request] req
        def signature req, service_signing_name = nil
          sign(credentials.secret_access_key, string_to_sign(req))
        end

        # @param [Http::Request] req
        def string_to_sign req
          OpenSSL::Digest::SHA256.digest([
            req.http_method,
            "/",
            "",
            canonical_headers(req),
            req.body
          ].join("\n"))
        end

        # @param [Http::Request] req
        def canonical_headers req
          headers_to_sign(req).map do |name|
            value = req.headers[name]
            "#{name.downcase.strip}:#{value.strip}\n"
          end.sort.join
        end

        # @param [Http::Request] req
        def headers_to_sign req
          req.headers.keys.select do |header|
              header == "host" ||
              header == "content-encoding" ||
              header =~ /^x-amz/
          end
        end

      end
    end
  end
end
