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

    # @api private
    class QueryRequestBuilder

      def initialize api_version, operation
        @api_version = api_version
        @operation_name = operation[:name]
        @grammar = OptionGrammar.customize(operation[:inputs])
      end

      def populate_request request, options

          now = Time.now.utc.strftime('%Y-%m-%dT%H:%M:%SZ')

          request.headers['Content-Type'] =
            "application/x-www-form-urlencoded; charset=utf-8"

          request.add_param 'Timestamp', now
          request.add_param 'Version', @api_version
          request.add_param 'Action', @operation_name

          @grammar.request_params(options).each do |param|
            request.add_param(param)
          end
          request.body = request.url_encoded_params

      end

    end

  end
end
