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
  class ElasticTranscoder

    class Client < Core::RESTJSONClient

      API_VERSION = '2012-09-25'

      signature_version :Version4, 'elastictranscoder'

      # @api private
      def extract_error_details response
        if
          response.http_response.status >= 300 and
          body = response.http_response.body and
          json = (::JSON.load(body) rescue nil)
        then
          headers = response.http_response.headers
          code = headers['x-amzn-errortype'].first.split(':')[0]
          message = json['message'] || json['Message']
          [code, message]
        end
      end

      # @api private
      CACHEABLE_REQUESTS = Set[]

    end

    class Client::V20120925 < Client

      define_client_methods('2012-09-25')

    end
  end
end
