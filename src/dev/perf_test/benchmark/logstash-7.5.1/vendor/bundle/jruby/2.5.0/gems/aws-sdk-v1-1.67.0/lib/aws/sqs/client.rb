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
  class SQS

    # Client class for Amazon Simple Queue Service (SQS).
    class Client < Core::QueryClient

      API_VERSION = '2012-11-05'

      signature_version :Version4, 'sqs'

      # @api private
      CACHEABLE_REQUESTS = Set[]

      private

      def build_request *args
        request = super(*args)
        if url_param = request.params.find { |p| p.name == "QueueUrl" }
          url = URI.parse(url_param.value)
          if url.class == URI::Generic
            raise ArgumentError, "invalid queue url `#{url_param.value}'"
          end
          request.host = url.host
          request.uri = url.request_uri
          if matches = request.host.match(/^sqs\.(.+?)\./)
            request.region = matches[1]
          end
        end
        request
      end

    end

    class Client::V20121105 < Client

      define_client_methods('2012-11-05')

    end
  end
end
