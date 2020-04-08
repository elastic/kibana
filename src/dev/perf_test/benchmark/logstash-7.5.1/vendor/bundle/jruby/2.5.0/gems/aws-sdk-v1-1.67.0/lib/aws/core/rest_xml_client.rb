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
    # @since 1.8.0
    class RESTXMLClient < Core::Client

      protected

      def self.request_builder_for api_config, operation
        RESTRequestBuilder.new(operation,
          :format => :xml,
          :xmlnamespace => api_config[:namespace])
      end

      def self.response_parser_for api_config, operation
        RESTResponseParser.new(operation, :format => :xml)
      end

      def extract_error_details response
        if
          response.http_response.status >= 300 and
          body = response.http_response.body and
          error = errors_module::GRAMMAR.parse(body) and
          error[:code]
        then
          [error[:code], error[:message]]
        end
      end

    end

    # @deprecated Use RESTXMLClient instead.
    RESTClient = RESTXMLClient
  end
end
