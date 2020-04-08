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

    # # Response
    #
    # Each Service has a Client class.  There is one method per service
    # operation defined on the client.  These methods all return a {Response}
    # object.
    #
    # In addition to the response data, these responses provide metadata
    # about the HTTP request made and the HTTP response received.
    #
    # ## Response Data
    #
    # You can access the response data for a client request using the {#data}
    # method or the {#[]} method.  Response data is a hash and {#[]} is
    # a shortcut for accessing this hash.
    #
    #     # make a request to describe one instance
    #     ec2 = AWS::EC2.new
    #     response = ec2.client.describe_instances(:instance_ids => ['i-12345678'])
    #
    #     # find the instance in the response data (2 ways to get the data)
    #     instance = response[:reservation_set].first[:instance_set].first
    #     instance = response.data[:reservation_set].first[:instance_set].first
    #
    #     instance[:status] #=> 'running'
    #
    # ## Response Metadata
    #
    # In addition to the response data, there is additional information
    # available with the response, including:
    #
    # * {#request_type} - the name of the client request method
    # * {#request_options} - the hash of options passed to the client method
    # * {#http_request} - The HTTP request made
    # * {#http_response} - the HTTP response received
    #
    # Given the example and response object from above:
    #
    #     response.request_type #=> :describe_instances
    #     response.request_options #=> { :instance_ids => ['i-12345678'] }
    #     response.http_request #=> #<AWS::Core::Http::Request>
    #     response.http_response #=> #<AWS::Core::Http::Response>
    #
    class Response

      include AsyncHandle

      # @return [Hash] Returns the response data as a hash.
      attr_accessor :data

      # @api private
      attr_accessor :config

      # @return [Symbol] The name of the client request method that
      #   returned this response.
      attr_accessor :request_type

      # @return [String] The API version of the request/client.
      attr_accessor :api_version

      # @return [Hash] Returns the hash of options passed to the client
      #   request method that generated this response.
      attr_accessor :request_options

      # @return [Core::Http::Request]
      attr_accessor :http_request

      # @return [Core::Http::Response]
      attr_accessor :http_response

      # @return [Boolean] true if the response was generated from a
      #   another cached response.
      attr_accessor :cached

      alias_method :cached?, :cached

      # @return [AWS::Error,nil] Returns nil unless the request failed.
      #   Normally this will be nil unless you are using the Asynchronous
      #   interface.
      attr_accessor :error

      # @return [Integer] Returns the number of times the request
      #   was retried.
      attr_accessor :retry_count

      # @return [Float] The total number of seconds taken to make the
      #   request and return the response.
      attr_accessor :duration

      # @param [Http::Request] http_request
      # @param [Http::Response] http_response
      def initialize http_request = nil, http_response = nil, &block
        @http_request = http_request
        @http_response = http_response
        @request_builder = block
        @data = {}
        @retry_count = 0
        @duration = 0
        build_request if @request_builder && !http_request
      end

      # Provides access to the response data.  This is a short-cut
      # for calling `response.data[key]`.
      #
      # @param [Symbol,String] key
      # @return [Hash,nil]
      def [] key
        data[key]
      end

      # @return [Boolean] Returns true if there is no response error.
      def successful?
        error.nil?
      end

      # @return [Boolean] Returns `true` if the http request failed due to
      #   a networking issue.
      def network_error?
        http_response.network_error?
      end

      # @return [String]
      # @api private
      def inspect
        data.inspect
      end

      # @return [String]
      # @api private
      def cache_key
        [
          api_version,
          http_request.access_key_id,
          http_request.host,
          request_type,
          serialized_options
        ].join(":")
      end

      # Rebuilds the HTTP request using the block passed to the initializer.
      # This is primarily used by the client when a request must be retried
      # (throttling, server errors, socket errors, etc).
      # @api private
      def rebuild_request
        @http_request.body_stream.rewind if @http_request.body_stream
        build_request
      end

      # @return [Boolean] Returns `false` if it is not safe to retry a
      #   request.  This happens when the http request body is an IO
      #   object that can not be rewound and re-streamed.
      def safe_to_retry?
        @http_request.body_stream.nil? or
        @http_request.body_stream.respond_to?(:rewind)
      end

      protected

      def build_request
        @http_request = @request_builder.call
      end

      # @note The prefered method to get as response data is to use {#[]}.
      #
      # This provides a backwards-compat layer to the old response objects
      # where each response value had a method extended onto this object.
      # Now all response data is accessible as a hash.
      #
      # @see #[]
      # @see #data
      #
      def method_missing *args, &block
        Core::Data.new(data).send(*args, &block)
      end

      def serialized_options
        serialize_options_hash(request_options)
      end

      def serialize_options_hash(hash)
        "(" + hash.keys.sort_by(&:to_s).map do |key|
          "#{key}=#{serialize_options_value(hash[key])}"
        end.join(" ") + ")"
      end

      def serialize_options_value(value)
        case value
        when Hash  then serialize_options_hash(value)
        when Array then serialize_options_array(value)
        else value.inspect
        end
      end

      def serialize_options_array array
        "[" + array.map{|v| serialize_options_value(v) }.join(" ") + "]"
      end

    end
  end
end
