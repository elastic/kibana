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
    class RESTJSONClient < Core::Client

      protected

      def self.request_builder_for api_config, operation
        Core::RESTRequestBuilder.new(operation, :format => :json)
      end

      def self.response_parser_for api_config, operation
        Core::RESTResponseParser.new(operation, :format => :json)
      end

      def extract_error_details response
        if
          response.http_response.status >= 300 and
          body = response.http_response.body and
          json = (::JSON.load(body) rescue nil)
        then
          [json['code'], json['message']]
        end
      end

    end
  end
end
