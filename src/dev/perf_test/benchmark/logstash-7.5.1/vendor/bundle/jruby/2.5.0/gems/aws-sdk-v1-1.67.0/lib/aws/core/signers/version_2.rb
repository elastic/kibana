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
      class Version2

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
          req.add_param('AWSAccessKeyId', credentials.access_key_id)
          if token = credentials.session_token
            req.add_param("SecurityToken", token)
          end
          req.add_param('SignatureVersion', '2')
          req.add_param('SignatureMethod', 'HmacSHA256')
          req.add_param('Signature', signature(req))
          req.body = req.url_encoded_params
          req
        end

        private

        # @param [Http::Request] req
        def signature req
          sign(credentials.secret_access_key, string_to_sign(req))
        end

        # @param [Http::Request] req
        def string_to_sign req

          host =
            case req.port
            when 80, 443 then req.host
            else "#{req.host}:#{req.port}"
            end

          [
            req.http_method,
            host.to_s.downcase,
            req.path,
            req.url_encoded_params,
          ].join("\n")

        end

      end
    end
  end
end
