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
    module Http

      # # NetHttpHandler
      #
      # This is the default HTTP handler for the aws-sdk gem.  It uses
      # Ruby's Net::HTTP to make requests.  It uses persistent connections
      # and a connection pool.
      #
      class NetHttpHandler

        class TruncatedBodyError < IOError; end

        # @api private
        NETWORK_ERRORS = [
          SocketError, EOFError, IOError, Timeout::Error,
          Errno::ECONNABORTED, Errno::ECONNRESET, Errno::EPIPE,
          Errno::EINVAL, Errno::ETIMEDOUT, Errno::EHOSTUNREACH,
          OpenSSL::SSL::SSLError
        ]

        # (see ConnectionPool.new)
        def initialize options = {}
          @pool = options[:connection_pool] || ConnectionPool.new(options)
          @verify_content_length = options[:verify_response_body_content_length]
        end

        # @return [ConnectionPool]
        attr_reader :pool

        # Given a populated request object and an empty response object,
        # this method will make the request and them populate the
        # response.
        # @param [Request] request
        # @param [Response] response
        # @return [nil]
        def handle request, response, &read_block
          retry_possible = true

          begin

            @pool.session_for(request.endpoint) do |http|

              http.read_timeout = request.read_timeout
              http.continue_timeout = request.continue_timeout if
                http.respond_to?(:continue_timeout=)

              exp_length = nil
              act_length = 0
              http.request(build_net_http_request(request)) do |net_http_resp|
                response.status = net_http_resp.code.to_i
                response.headers = net_http_resp.to_hash
                exp_length = determine_expected_content_length(response)
                if block_given? and response.status < 300
                  net_http_resp.read_body do |data|
                    begin
                      act_length += data.bytesize
                      yield data unless data.empty?
                    ensure
                      retry_possible = false
                    end
                  end
                else
                  response.body = net_http_resp.read_body
                  act_length += response.body.bytesize unless response.body.nil?
                end
              end
              run_check = exp_length && request.http_method != "HEAD" && @verify_content_length
              if run_check && act_length != exp_length
                raise TruncatedBodyError, 'content-length does not match'
              end
            end

          rescue *NETWORK_ERRORS => error
            raise error unless retry_possible
            response.network_error = error
          end
          nil
        end

        protected

        def determine_expected_content_length response
          if header = response.headers['content-length']
            if header.is_a?(Array)
              header.first.to_i
            end
          end
        end

        # Given an AWS::Core::HttpRequest, this method translates
        # it into a Net::HTTPRequest (Get, Put, Post, Head or Delete).
        # @param [Request] request
        # @return [Net::HTTPRequest]
        def build_net_http_request request

          # Net::HTTP adds a content-type (1.8.7+) and accept-encoding (2.0.0+)
          # to the request if these headers are not set.  Setting a default
          # empty value defeats this.
          #
          # Removing these are necessary for most services to no break request
          # signatures as well as dynamodb crc32 checks (these fail if the
          # response is gzipped).
          headers = { 'content-type' => '', 'accept-encoding' => '' }

          request.headers.each_pair do |key,value|
            headers[key] = value.to_s
          end

          request_class = case request.http_method
            when 'GET'    then Net::HTTP::Get
            when 'PUT'    then Net::HTTP::Put
            when 'POST'   then Net::HTTP::Post
            when 'HEAD'   then Net::HTTP::Head
            when 'DELETE' then Net::HTTP::Delete
            else
              msg = "unsupported http method: #{request.http_method}"
              raise ArgumentError, msg
            end

          net_http_req = request_class.new(request.uri, headers)
          net_http_req.body_stream = request.body_stream
          net_http_req

        end

      end

    end
  end
end
