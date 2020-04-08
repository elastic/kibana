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
  class STS

    # Client class for AWS Security Token Service (STS).
    class Client < Core::QueryClient

      API_VERSION = '2011-06-15'

      signature_version :Version4, 'sts'

      REGION_US_E1 = 'sts.amazonaws.com'

      # @api private
      CACHEABLE_REQUESTS = Set[]

      def initialize *args
        super
        unless config.use_ssl?
          msg = 'AWS Security Token Service (STS) requires ssl but the ' +
            ':use_ssl option is set to false.  Try passing :use_ssl => true'
          raise ArgumentError, msg
        end
      end

      # Two STS operations are un-signed
      alias do_sign_request sign_request
      def sign_request(req)
        action = req.params.find { |param| param.name == 'Action' }.value
        unsigned = %w( AssumeRoleWithWebIdentity AssumeRoleWithSAML )
        do_sign_request(req) unless unsigned.include?(action)
        req
      end

    end

    class Client::V20110615 < Client

      define_client_methods('2011-06-15')

    end
  end
end
