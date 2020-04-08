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
    class RESTRequestBuilder

      # @api private
      def initialize operation, options = {}

        @http = operation[:http]
        @rules = operation[:inputs]

        @validator = Options::Validator.new(@rules)

        @serializer =
          case options[:format]
          when :xml
            namespace = options[:xmlnamespace]
            name = operation[:name]
            Options::XMLSerializer.new(namespace, name, operation)
          when :json
            Options::JSONSerializer.new(@rules, @http[:request_payload])
          else
            raise ArgumentError, "unhandled format: #{options[:format]}"
          end

      end

      # Populates a Http::Request with the following:
      #
      #   * HTTP method
      #   * URI
      #   * headers
      #   * body
      #
      # @param [Http::Request] request
      #
      # @param [Hash] params The hash of request options provided
      #   to the client request method.  This will be used to populate
      #   the headers, uri and body.
      #
      # @raise [ArgumentError] Raises ArgumentError when any of the
      #   request options are invalid (wrong type, missing, unknown, etc).
      #
      def populate_request request, params
        params = @validator.validate!(params)
        populate_method(request)
        populate_uri(request, params)
        populate_headers(request, params)
        populate_body(request, params)
      end

      private

      def populate_method request
        request.http_method = @http[:verb]
      end

      def populate_uri request, params
        request.uri = extract_uri(params)
      end

      def populate_headers request, params
        extract_headers(params).each_pair do |header_name, header_value|
          request.headers[header_name] = header_value
        end
      end

      # @param [Hash] params
      # @return [String]
      def extract_uri params

        path, querystring = @http[:uri].split(/\?/)

        uri = path.gsub(/:\w+/) do |param_name|
          if param = params.delete(param_name.sub(/^:/, '').to_sym)
            UriEscape.escape(param)
          else
            raise ArgumentError, "missing required option #{param_name}"
          end
        end

        querystring_parts = []
        querystring.to_s.split(/&|;/).each do |part|
          param_name = part.match(/:(\w+)/)[1]
          if param = params.delete(param_name.to_sym)
            param = UriEscape.escape(param)
            querystring_parts << part.sub(/:#{param_name}/, param)
          end
        end

        unless querystring_parts.empty?
          uri << "?#{querystring_parts.join('&')}"
        end

        uri

      end

      # @param [Hash] params
      # @return [Hash]
      def extract_headers params
        headers = {}
        (@http[:request_headers] || {}).each_pair do |param,header|
          headers[header] = params[param] if params.key?(param)
        end
        headers
      end

      # @param [Hash] params
      # @return [String,nil]
      def populate_body request, params
        if params.empty?
          request.body = nil
        elsif payload = streaming_param # streaming request
          request.body_stream = params[payload]
          request.headers['Content-Length'] = size(params[payload])
        else
          request.body = @serializer.serialize(params)
        end
      end

      def size(payload)
        if payload.respond_to?(:path) && payload.path
          File.size(payload.path)
        else
          payload.size
        end
      end

      def streaming_param
        if payload = @http[:request_payload]
          @rules[payload][:type] == :blob ? payload : nil
        end
      end

    end

  end
end
