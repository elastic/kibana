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

require 'base64'

module AWS
  module Core
    module Signers
      # @api private
      module Base

        # Signs a string using the credentials stored in memory.
        # @param [String] secret Usually an AWS secret access key.
        # @param [String] string_to_sign The string to sign.
        # @param [String] digest_method The digest method to use when
        #   computing the HMAC digest.
        # @return [String] Returns the computed signature.
        def sign secret, string_to_sign, digest_method = 'sha256'
          Base64.encode64(hmac(secret, string_to_sign, digest_method)).strip
        end
        module_function :sign

        # Computes an HMAC digest of the passed string.
        # @param [String] key
        # @param [String] value
        # @param [String] digest ('sha256')
        # @return [String]
        def hmac key, value, digest = 'sha256'
          OpenSSL::HMAC.digest(OpenSSL::Digest.new(digest), key, value)
        end
        module_function :hmac

      end
    end
  end
end
