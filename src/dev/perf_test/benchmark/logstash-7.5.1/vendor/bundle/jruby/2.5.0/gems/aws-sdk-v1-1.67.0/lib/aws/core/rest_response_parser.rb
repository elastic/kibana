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

    # Given a hash of request options, a REST::RequestHandler can
    # populate a Core::Http::Request object.
    class RESTResponseParser

      # @api private
      def initialize operation, options
        @http = operation[:http]
        @parser =
          case options[:format]
          when :xml then XML::Parser.new(operation[:outputs])
          when :json then Core::JSONParser.new(operation[:outputs])
          else raise "unhandled format: #{options[:format].inspect}"
          end
      end

      # Given a response object, this method extract and returns a
      # hash of response data.
      # @param [Response] response
      # @return [Hash]
      def extract_data response

        if payload = @http[:response_payload]
          data = { payload => response.http_response.body }
        else
          data = @parser.parse(response.http_response.body)
        end

        if header = response.http_response.headers['x-amzn-requestid']
          data[:request_id] = [header].flatten.first
        end

        # extract headers and insert into response
        (@http[:response_headers] || {}).each_pair do |name,header_name|
          if header = response.http_response.headers[header_name.downcase]
            data[name] = [header].flatten.first
          end
        end

        data

      end

      def simulate
        {}
      end

    end

  end
end
