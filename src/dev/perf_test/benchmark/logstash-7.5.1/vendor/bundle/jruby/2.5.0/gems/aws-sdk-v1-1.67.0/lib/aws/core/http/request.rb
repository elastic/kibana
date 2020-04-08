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

      # Base class for all service reqeusts.  This class describes
      # a basic HTTP request, but will not make one.  It is consumed
      # by a HTTP handler class that sends the actual request
      # and parses the actual response.
      class Request

        extend Deprecations

        # Returns a new empty http request object.
        def initialize
          @http_method = 'POST'
          @use_ssl = true
          @headers = CaseInsensitiveHash.new
          @uri = '/'
          @params = []
          @read_timeout = 60
        end

        # @return [String] hostname of the request
        attr_accessor :host

        # @return [Integer] Returns the port number this request will be
        #   made via (usually 443 or 80).
        attr_accessor :port

        # @return [String] Returns the HTTP request method (e.g. 'GET', 'PUT',
        #   'POST', 'HEAD' or 'DELETE').  Defaults to 'POST'.
        attr_accessor :http_method

        # @return [CaseInsensitiveHash] request headers
        attr_accessor :headers

        # @return [String] Returns the request URI (path + querystring).
        attr_accessor :uri

        # @return [String] The region name this request is for.  Only needs
        #   to be populated for requests against signature v4 endpoints.
        attr_accessor :region

        # @api private
        attr_accessor :service

        # @return [String] Returns the AWS access key ID used to authorize the
        #   request.
        # @api private
        attr_accessor :access_key_id

        # @return [Array<Param>] Returns an array of request params.  Requests
        #   that use signature version 2 add params to the request and then
        #   sign those before building the {#body}.  Normally the {#body}
        #   should be set directly with the HTTP payload.
        # @api private
        attr_accessor :params

        # @return [String] The name of the service for Signature v4 signing.
        #   This does not always match the ruby name (e.g.
        #   simple_email_service and ses do not match).
        attr_accessor :service_ruby_name

        # @return [Integer] The number of seconds the service has to respond
        #   before a timeout error is raised on the request.
        attr_accessor :read_timeout

        alias_method :default_read_timeout, :read_timeout
        deprecated :default_read_timeout, :use => :read_timeout

        # @return [Boolean] Returns `true` if this request should be made
        #   with SSL enabled.
        attr_accessor :use_ssl

        alias_method :use_ssl?, :use_ssl

        # @return [Float] timeout The number of seconds to wait for a
        #   100-continue response before sending the HTTP request body.
        # @api private
        attr_accessor :continue_timeout

        # @api private
        def endpoint
          scheme = use_ssl ? 'https' : 'http'
          port = case scheme
          when 'https' then self.port == 443 ? '' : ":#{self.port}"
          when 'http' then self.port == 80 ? '' : ":#{self.port}"
          end
          "#{scheme}://#{host}#{port}"
        end

        # @return [Integer] Returns the port the request will be made over.
        #   Defaults to 443 for SSL requests and 80 for non-SSL requests.
        def port
          @port || (use_ssl? ? 443 : 80)
        end

        # @return [String] Returns the HTTP request path.
        def path
          uri.split(/\?/)[0]
        end

        # @return [String] Returns the HTTP request querystring.
        def querystring
          uri.split(/\?/)[1]
        end

        # Adds a request param.
        #
        # @overload add_param(param_name, param_value = nil)
        #   Add a param (name/value)
        #   @param [String] param_name
        #   @param [String] param_value Leave blank for sub resources
        #
        # @overload add_param(param_obj)
        #   Add a param (object)
        #   @param [Param] param_obj
        #
        # @api private
        def add_param name_or_param, value = nil
          if name_or_param.kind_of?(Param)
            @params << name_or_param
          else
            @params << Param.new(name_or_param, value)
          end
        end

        # @api private
        def remove_param(name)
          if param = @params.find { |p| p.name == name }
            @params.delete(param)
          end
        end

        # @api private
        # @return [String,nil] Returns the url encoded request params.  If there
        #   are no params, then nil is returned.
        def url_encoded_params
          params.empty? ? nil : params.sort.collect(&:encoded).join('&')
        end

        # @param [String] body
        def body= body
          @body = body
          if body
            headers['content-length'] = body.bytesize if body
          else
            headers.delete('content-length')
          end
        end

        # @note Calling #body on a request with a #body_stream
        #   will cause the entire stream to be read into memory.
        # @return [String,nil] Returns the request body.
        def body
          if @body
            @body
          elsif @body_stream
            @body = @body_stream.read
            if @body_stream.respond_to?(:rewind)
              @body_stream.rewind
            else
              @body_stream = StringIO.new(@body)
            end
            @body
          else
            nil
          end
        end

        # Sets the request body as an IO object that will be streamed.
        # @note You must also set the #headers['content-length']
        # @param [IO] stream An object that responds to #read and #eof.
        def body_stream= stream
          @body_stream = stream
        end

        # @return [IO,nil]
        def body_stream
          if @body_stream
            @body_stream
          elsif @body
            StringIO.new(@body)
          else
            nil
          end
        end

        # @api private
        class CaseInsensitiveHash < Hash

          def []= key, value
            super(key.to_s.downcase, value)
          end

          def [] key
            super(key.to_s.downcase)
          end

          def has_key?(key)
            super(key.to_s.downcase)
          end
          alias_method :key?, :has_key?
          alias_method :include?, :has_key?
          alias_method :member?, :has_key?

        end

        # Represents a single request paramater.  Some services accept this
        # in a form encoded body string, others as query parameters.
        # It is up to each service's Request class to determine how to
        # consume these params.
        # @api private
        class Param

          include UriEscape

          attr_accessor :name, :value

          def initialize name, value = nil
            @name = name
            @value = value
          end

          def <=> other
            name <=> other.name
          end

          def to_s
            value ? "#{name}=#{value}" : name
          end

          def ==(other)
            other.kind_of?(Param) and to_s == other.to_s
          end

          def encoded
            value ? "#{escape(name)}=#{escape(value)}" : "#{escape(name)}="
          end

        end

      end
    end
  end
end
