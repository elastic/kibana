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

require 'json'
require 'set'
require 'yaml'
require 'uri'

module AWS
  module Core

    # Base client class for all of the Amazon AWS service clients.
    class Client

      extend Deprecations

      # Raised when a request failed due to a networking issue (e.g.
      # EOFError, IOError, Errno::ECONNRESET, Errno::EPIPE,
      # Timeout::Error, etc)
      class NetworkError < StandardError; end

      extend Naming

      # @api private
      CACHEABLE_REQUESTS = Set[]

      # Creates a new low-level client.
      # @param [Hash] options
      # @option options [Core::Configuration] :config (AWS.config)
      #   The base configuration object to use.  All other options
      #   are merged with this.  Defaults to the AWS.config.
      # @option (see AWS.config)
      def initialize options = {}

        options = options.dup # so we don't modify the options passed in

        @service_ruby_name = self.class.service_ruby_name

        # translate these into service specific configuration options,
        # e.g. :endpoint into :s3_endpoint
        [:endpoint, :region, :port, :signature_version].each do |opt|
          if options[opt]
            options[:"#{service_ruby_name}_#{opt}"] = options.delete(opt)
          end
        end

        @config = (options.delete(:config) || AWS.config)
        @config = @config.with(options)

        @region = @config.send(:"#{service_ruby_name}_region")

        @credential_provider = @config.credential_provider
        @http_handler = @config.http_handler
        @endpoint = config.send(:"#{service_ruby_name}_endpoint")
        @port = config.send(:"#{service_ruby_name}_port")

        # deprecated attributes
        @http_read_timeout = @config.http_read_timeout
      end

      # @return [Configuration] This clients configuration.
      attr_reader :config

      # @return [CredentialProviders::Provider] Returns the credential
      #   provider for this client.
      # @api private
      attr_reader :credential_provider

      # @return [String] The snake-cased ruby name for the service
      #   (e.g. 's3', 'iam', 'dynamo_db', etc).
      # @api private
      attr_reader :service_ruby_name

      # @return [Integer] What port this client makes requests via.
      # @api private
      attr_reader :port

      # @return [Integer] The number of seconds before requests made by
      #   this client should timeout if they have not received a response.
      # @api private
      attr_reader :http_read_timeout
      deprecated :http_read_timeout, :use => 'config.http_read_timeout'

      # @return [String] Returns the service endpoint (hostname) this client
      #   makes requests against.
      # @api private
      attr_reader :endpoint

      # @return (see Client.operations)
      def operations
        self.class.operations
      end

      # Returns a copy of the client with a different HTTP handler.
      # You can pass an object like BuiltinHttpHandler or you can
      # use a block; for example:
      #
      #   s3_with_logging = s3.with_http_handler do |request, response|
      #     $stderr.puts request.inspect
      #     super(request, response)
      #     $stderr.puts response.inspect
      #   end
      #
      # The block executes in the context of an HttpHandler
      # instance, and `super` delegates to the HTTP handler used by
      # this client.  This provides an easy way to spy on requests
      # and responses.  See HttpHandler, HttpRequest, and
      # HttpResponse for more details on how to implement a fully
      # functional HTTP handler using a different HTTP library than
      # the one that ships with Ruby.
      # @param handler (nil) A new http handler.  Leave blank and pass a
      #   block to wrap the current handler with the block.
      # @return [Core::Client] Returns a new instance of the client class with
      #   the modified or wrapped http handler.
      def with_http_handler(handler = nil, &blk)
        handler ||= Http::Handler.new(@http_handler, &blk)
        with_options(:http_handler => handler)
      end

      # Returns a new client with the passed configuration options
      # merged with the current configuration options.
      #
      #   no_retry_client = client.with_options(:max_retries => 0)
      #
      # @param [Hash] options
      # @option (see AWS.config)
      # @return [Client]
      def with_options options
        with_config(config.with(options))
      end

      # @param [Configuration] config The configuration object to use.
      # @return [Core::Client] Returns a new client object with the given
      #   configuration.
      # @api private
      def with_config config
        self.class.new(:config => config)
      end

      # The stub returned is memoized.
      # @see new_stub_for
      # @api private
      def stub_for method_name
        @stubs ||= {}
        @stubs[method_name] ||= new_stub_for(method_name)
      end

      # Primarily used for testing, this method returns an empty pseudo
      # service response without making a request.  Its used primarily for
      # testing the lighter level service interfaces.
      # @api private
      def new_stub_for method_name
        response = Response.new(Http::Request.new, Http::Response.new)
        response.request_type = method_name
        response.request_options = {}
        send("simulate_#{method_name}_response", response)
        response.signal_success
        response
      end

      # Logs the warning to the configured logger, otherwise to stderr.
      # @param [String] warning
      # @return [nil]
      def log_warning warning
        message = '[aws-sdk-gem-warning] ' + warning
        if config.logger
          config.logger.warn(message)
        else
          $stderr.puts(message)
        end
        nil
      end

      # @api private
      def inspect
        "#<#{self.class.name}>"
      end

      # @api private
      def to_yaml_properties
        skip = %w(@config @credential_provider @http_handler)
        instance_variables.map(&:to_s) - skip
      end

      protected

      # @api private
      def new_request
        Http::Request.new
      end

      def new_response(*args, &block)
        resp = Response.new(*args, &block)
        resp.config = config
        resp.api_version = self.class::API_VERSION
        resp
      end

      def make_async_request response

        pauses = async_request_with_retries(response, response.http_request)

        response

      end

      def async_request_with_retries response, http_request, retry_delays = nil

        response.http_response = Http::Response.new

        handle = Object.new
        handle.extend AsyncHandle
        handle.on_complete do |status|
          case status
          when :failure
            response.error = StandardError.new("failed to contact the service")
            response.signal_failure
          when :success
            populate_error(response)
            retry_delays ||= sleep_durations(response)
            if should_retry?(response) and !retry_delays.empty?
              rebuild_http_request(response)
              @http_handler.sleep_with_callback(retry_delays.shift) do
                async_request_with_retries(response, response.http_request, retry_delays)
              end
            else
              response.error ?
                response.signal_failure :
                response.signal_success
            end
          end
        end

        @http_handler.handle_async(http_request, response.http_response, handle)

      end

      def make_sync_request response, &read_block
        retry_server_errors do

          response.http_response = Http::Response.new

          @http_handler.handle(
            response.http_request,
            response.http_response,
            &read_block)

          if
            block_given? and
            response.http_response.status < 300 and
            response.http_response.body
          then

            msg = ":http_handler read the entire http response body into "
            msg << "memory, it should have instead yielded chunks"
            log_warning(msg)

            # go ahead and yield the body on behalf of the handler
            yield(response.http_response.body)

          end

          populate_error(response)
          response.signal_success unless response.error
          response

        end
      end

      def retry_server_errors &block

        response = yield

        sleeps = sleep_durations(response)
        while should_retry?(response)
          break if sleeps.empty?
          Kernel.sleep(sleeps.shift)
          rebuild_http_request(response)
          response = yield
        end

        response

      end

      def rebuild_http_request response
        credential_provider.refresh if expired_credentials?(response)
        response.rebuild_request
        if redirected?(response)
          loc = URI.parse(response.http_response.headers['location'].first)
          AWS::Core::MetaUtils.extend_method(response.http_request, :host) do
            loc.host
          end
          response.http_request.host = loc.host
          response.http_request.port = loc.port
          response.http_request.uri = loc.path
        end
        response.retry_count += 1
      end

      def sleep_durations response
        if expired_credentials?(response)
          [0]
        else
          factor = scaling_factor(response)
          Array.new(config.max_retries) {|n| (2 ** n) * factor }
        end
      end

      def scaling_factor response
        throttled?(response) ? (0.5 + Kernel.rand * 0.1) : 0.3
      end

      def should_retry? response
        if retryable_error?(response)
          response.safe_to_retry?
        else
          false
        end
      end

      def retryable_error? response
        expired_credentials?(response) or
        response.network_error? or
        throttled?(response) or
        redirected?(response) or
        response.error.kind_of?(Errors::ServerError)
      end

      # @return [Boolean] Returns `true` if the response contains an
      #   error message that indicates credentials have expired.
      def expired_credentials? response
        response.error and
        response.error.respond_to?(:code) and
        (
          response.error.code.to_s.match(/expired/i) or # session credentials
          response.error.code == 'InvalidClientTokenId' or # query services
          response.error.code == 'UnrecognizedClientException' or # json services
          response.error.code == 'InvalidAccessKeyId' or # s3
          response.error.code == 'AuthFailure' # ec2
        )
      end

      def throttled? response
        response.error and
        response.error.respond_to?(:code) and
        (
          response.error.code.to_s.match(/throttl/i) or
          #response.error.code == 'Throttling' or # most query services
          #response.error.code == 'ThrottlingException' or # json services
          #response.error.code == 'RequestThrottled' or # sqs
          response.error.code == 'ProvisionedThroughputExceededException' or # ddb
          response.error.code == 'RequestLimitExceeded' or # ec2
          response.error.code == 'BandwidthLimitExceeded' # cloud search
        )
      end

      def redirected? response
        response.http_response.status == 307
      end

      def return_or_raise options, &block
        response = yield
        unless options[:async]
          raise response.error if response.error
        end
        response
      end

      # Yields to the given block (which should be making a
      # request and returning a {Response} object).  The results of the
      # request/response are logged.
      #
      # @param [Hash] options
      # @option options [Boolean] :async
      # @return [Response]
      def log_client_request options, &block

        # time the request, retries and all
        start = Time.now
        response = yield
        response.duration = Time.now - start

        if options[:async]
          response.on_complete { log_response(response) }
        else
          log_response(response)
        end

        response

      end

      # Logs the response to the configured logger.
      # @param [Response] response
      # @return [nil]
      def log_response response
        if config.logger
          message = config.log_formatter.format(response)
          config.logger.send(config.log_level, message)
        end
        nil
      end

      def populate_error response

        status = response.http_response.status

        error_code, error_message = extract_error_details(response)

        error_args = [
          response.http_request,
          response.http_response,
          error_code,
          error_message
        ]

        response.error =
          case
          when response.network_error? then response.http_response.network_error
          when error_code then error_class(error_code).new(*error_args)
          when status >= 500 then Errors::ServerError.new(*error_args)
          when status >= 300 then Errors::ClientError.new(*error_args)
          else nil # no error
          end

      end

      # Extracts the error code and error message from a response
      # if it contains an error.  Returns nil otherwise.  Should be defined
      # in sub-classes (e.g. QueryClient, RESTClient, etc).
      # @param [Response] response
      # @return [Array<Code,Message>,nil] Should return an array with an
      #   error code and message, or `nil`.
      def extract_error_details response
        raise NotImplementedError
      end

      # Given an error code string, this method will return an error class.
      #
      #     AWS::EC2::Client.new.send(:error_code, 'InvalidInstanceId')
      #     #=> AWS::EC2::Errors::InvalidInstanceId
      #
      # @param [String] error_code The error code string as returned by
      #   the service.  If this class contains periods, they will be
      #   converted into namespaces (e.g. 'Foo.Bar' becomes Errors::Foo::Bar).
      #
      # @return [Class]
      #
      def error_class error_code
        errors_module.error_class(error_code)
      end

      # Returns the ::Errors module for the current client.
      #
      #     AWS::S3::Client.new.errors_module
      #     #=> AWS::S3::Errors
      #
      # @return [Module]
      #
      def errors_module
        AWS.const_get(self.class.to_s[/(\w+)::Client/, 1])::Errors
      end

      def client_request name, options, &read_block
        return_or_raise(options) do
          log_client_request(options) do

            if config.stub_requests?

              response = stub_for(name)
              response.http_request = build_request(name, options)
              response.request_options = options
              response

            else

              client = self

              response = new_response do
                req = client.send(:build_request, name, options)
                client.send(:sign_request, req)
                req
              end

              response.request_type = name
              response.request_options = options

              if
                cacheable_request?(name, options) and
                cache = AWS.response_cache and
                cached_response = cache.cached(response)
              then
                cached_response.cached = true
                cached_response
              else

                # process the http request
                options[:async] ?
                make_async_request(response, &read_block) :
                  make_sync_request(response, &read_block)

                # process the http response
                response.on_success do
                  send("process_#{name}_response", response)
                  if cache = AWS.response_cache
                    cache.add(response)
                  end
                end

                # close files we opened
                response.on_complete do
                  if response.http_request.body_stream.is_a?(ManagedFile)
                    response.http_request.body_stream.close
                  end
                end

                response

              end

            end

          end
        end
      end

      def cacheable_request? name, options
        self.class::CACHEABLE_REQUESTS.include?(name)
      end

      def build_request name, options

        # we dont want to pass the async option to the configure block
        opts = options.dup
        opts.delete(:async)

        http_request = new_request
        http_request.access_key_id = credential_provider.access_key_id
        http_request.service = self.class.name.split('::')[1]

        # configure the http request
        http_request.service_ruby_name = service_ruby_name
        http_request.host = endpoint
        http_request.port = port
        http_request.region = @region
        http_request.use_ssl = config.use_ssl?
        http_request.read_timeout = config.http_read_timeout

        send("configure_#{name}_request", http_request, opts)

        http_request.headers["user-agent"] = user_agent_string

        if
          @config.http_continue_threshold and
          http_request.headers['content-length'] and
          http_request.headers['content-length'].to_i > @config.http_continue_threshold
        then
          http_request.headers["expect"] = "100-continue"
          http_request.continue_timeout = @config.http_continue_timeout
        else
          http_request.continue_timeout = nil
        end

        http_request

      end

      # @param [Http::Request] req
      # @return [Http::Request]
      # @api private
      def sign_request req
        req
      end

      def user_agent_string
        engine = (RUBY_ENGINE rescue nil or "ruby")
        user_agent = "%s aws-sdk-ruby/#{VERSION} %s/%s %s" %
          [config.user_agent_prefix, engine, RUBY_VERSION, RUBY_PLATFORM]
        user_agent.strip!
        if AWS.memoizing?
          user_agent << " memoizing"
        end
        user_agent
      end

      class << self

        # @return [Array<Symbol>] Returns a list of service operations as
        #   method names supported by this client.
        # @api private
        def operations(options = {})
          if name.match(/V\d{8}$/)
            @operations ||= []
          else
            client_class(options).operations
          end
        end

        # @api private
        def request_builders
          @request_builders ||= {}
        end

        # @api private
        def response_parsers
          @response_parsers ||= {}
        end

        # @api private
        def new(*args, &block)
          options = args.last.is_a?(Hash) ? args.last : {}
          client = client_class(options).allocate
          client.send(:initialize, *args, &block)
          client
        end

        private

        def client_class(options)
          if name =~ /Client::V\d+$/
            self
          else
            const_get("V#{client_api_version(options).gsub(/-/, '')}")
          end
        end

        def client_api_version(options)
          api_version = options[:api_version]
          api_version ||= configured_version(options[:config]) if options[:config]
          api_version ||= configured_version(AWS.config)
          api_version || const_get(:API_VERSION)
        end

        def configured_version(config = AWS.config)
          svc_opt = AWS::SERVICES[name.split('::')[1]].method_name
          config.send(svc_opt)[:api_version]
        end

        protected

        # Define this in sub-classes (e.g. QueryClient, RESTClient, etc)
        def request_builder_for api_config, operation
          raise NotImplementedError
        end

        # Define this in sub-classes (e.g. QueryClient, RESTClient, etc)
        def response_parser_for api_config, operation
          raise NotImplementedError
        end

        # Adds a single method to the current client class.  This method
        # yields a request method builder that allows you to specify how:
        #
        # * the request is built
        # * the response is processed
        # * the response is stubbed for testing
        #
        def add_client_request_method method_name, options = {}, &block

          operations << method_name

          ClientRequestMethodBuilder.new(self, method_name, &block)

          method_def = <<-METHOD
            def #{method_name}(*args, &block)
              options = args.first ? args.first : {}
              client_request(#{method_name.inspect}, options, &block)
            end
          METHOD

          module_eval(method_def)

        end

        # Loads the API configuration for the given API version.
        # @param [String] api_version The API version date string
        #   (e.g. '2012-01-05').
        # @return [Hash]
        def load_api_config api_version
          lib = File.dirname(File.dirname(__FILE__))
          path = "#{lib}/api_config/#{service_name}-#{api_version}.yml"
          YAML.load(File.read(path))
        end

        # @param [Symbol] version
        # @param [String,nil] service_signing_name Required for `:Version4`
        # @api private
        def signature_version version, service_signing_name = nil
          define_method(:sign_request) do |req|
            @signer ||= begin
              signer_class = AWS::Core::Signers.const_get(version)
              signer_args = (version == :Version4) ?
                [credential_provider, service_signing_name, req.region] :
                [credential_provider]
              signer_class.new(*signer_args)
            end
            @signer.sign_request(req)
            req
          end
        end

        # Defines one method for each service operation described in
        # the API configuration.
        # @param [String] api_version
        def define_client_methods api_version

          const_set(:API_VERSION, api_version)

          api_config = load_api_config(api_version)

          api_config[:operations].each do |operation|

            builder = request_builder_for(api_config, operation)
            parser = response_parser_for(api_config, operation)

            define_client_method(operation[:method], builder, parser)

          end
        end

        def define_client_method method_name, builder, parser

          request_builders[method_name] = builder
          response_parsers[method_name] = parser

          add_client_request_method(method_name) do

            configure_request do |request, request_options|
              builder.populate_request(request, request_options)
            end

            process_response do |response|
              response.data = parser.extract_data(response)
            end

            simulate_response do |response|
              response.data = parser.simulate
            end

          end
        end

      end

      # @api private
      class ClientRequestMethodBuilder

        def initialize client_class, method_name, &block
          @client_class = client_class
          @method_name = method_name
          configure_request {|request, options|}
          process_response {|response|}
          simulate_response {|response|}
          instance_eval(&block)
        end

        def configure_request options = {}, &block
          name = "configure_#{@method_name}_request"
          MetaUtils.class_extend_method(@client_class, name, &block)
        end

        def process_response &block
          name = "process_#{@method_name}_response"
          MetaUtils.class_extend_method(@client_class, name, &block)
        end

        def simulate_response &block
          name = "simulate_#{@method_name}_response"
          MetaUtils.class_extend_method(@client_class, name, &block)
        end

      end

    end
  end
end
