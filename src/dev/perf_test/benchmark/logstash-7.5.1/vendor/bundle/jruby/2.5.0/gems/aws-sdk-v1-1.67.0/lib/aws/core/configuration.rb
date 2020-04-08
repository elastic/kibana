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

require 'set'
require 'uri'

module AWS
  module Core

    # A configuration object for AWS interfaces and clients.
    #
    # ## Configuring Credentials
    #
    # In order to do anything with AWS you will need to assign credentials.
    # The simplest method is to assign your credentials into the default
    # configuration:
    #
    #     AWS.config(:access_key_id => 'KEY', :secret_access_key => 'SECRET')
    #
    # You can also export them into your environment and they will be picked up
    # automatically:
    #
    #     export AWS_ACCESS_KEY_ID='YOUR_KEY_ID_HERE'
    #     export AWS_SECRET_ACCESS_KEY='YOUR_SECRET_KEY_HERE'
    #
    # For compatability with other AWS gems, the credentials can also be
    # exported like:
    #
    #     export AMAZON_ACCESS_KEY_ID='YOUR_KEY_ID_HERE'
    #     export AMAZON_SECRET_ACCESS_KEY='YOUR_SECRET_KEY_HERE'
    #
    # ## Modifying a Configuration
    #
    # Configuration objects are read-only.  If you need a different set of
    # configuration values, call {#with}, passing in the updates
    # and a new configuration object will be returned.
    #
    #     config = Configuration.new(:max_retries => 3)
    #     new_config = config.with(:max_retries => 2)
    #
    #     config.max_retries #=> 3
    #     new_config.max_retries #=> 2
    #
    # ## Global Configuration
    #
    # The global default configuration can be found at {AWS.config}
    #
    # @attr_reader [String,nil] access_key_id (nil)
    #   AWS access key id credential.
    #
    # @attr_reader [String,nil] secret_access_key (nil)
    #   AWS secret access key credential.
    #
    # @attr_reader [String,nil] session_token (nil) AWS secret token credential.
    #
    # @attr_reader [String] region
    #   The AWS region used for requests. The default is `us-east-1`.
    #
    # @attr_reader [Boolean] dynamo_db_big_decimals (true) When `true`,
    #   {DynamoDB} will convert number values returned by {DynamoDB::Client}
    #   from strings to BigDecimal objects.  If you set this to `false`,
    #   they will be converted from strings into floats (with a potential
    #   loss of precision).
    #
    # @attr_reader [Boolean] dynamo_db_retry_throughput_errors (true) When
    #   true, AWS::DynamoDB::Errors::ProvisionedThroughputExceededException
    #   errors will be retried.
    #
    # @attr_reader [Object] http_handler The http handler that sends requests
    #   to AWS.  Defaults to an HTTP handler built on net/http.
    #
    # @attr_reader [Integer] http_idle_timeout The number of seconds a
    #   persistent connection is allowed to sit idle before it should no
    #   longer be used.
    #
    # @attr_reader [Integer] http_open_timeout The number of seconds before
    #   the `http_handler` should timeout while trying to open a new HTTP
    #   session.
    #
    # @attr_reader [Integer] http_read_timeout The number of seconds before
    #   the `http_handler` should timeout while waiting for a HTTP
    #   response.
    #
    # @attr_reader [Boolean] http_wire_trace When `true`, the http handler
    #   will log all wire traces to the `:logger`.  If a `:logger` is not
    #   configured, then wire traces will be sent to standard out.
    #
    # @attr_reader [Logger,nil] logger (nil) The logging interface.
    #
    # @attr_reader [Symbol] log_level (:info) The log level to use when
    #   logging every API call.  Does not set the `:logger`'s log_level.
    #
    # @attr_reader [LogFormatter] log_formatter The log message formatter.
    #
    # @attr_reader [Integer] max_retries (3) The maximum number of times
    #   service errors (500) and throttling errors should be retried. There is
    #   an exponential backoff in between retries, so the more retries the
    #   longer it can take to fail.
    #
    # @attr_reader [URI,nil] proxy_uri (nil) The URI of the proxy
    #    to send service requests through.
    #
    # @attr_reader [Boolean] s3_force_path_style (false) When
    #   `true`, requests will always use path style.  This can be useful
    #   for testing environments.
    #
    # @attr_reader [Integer] s3_multipart_max_parts (10000)
    #   The maximum number of parts to split a file into when uploading
    #   in parts to S3.
    #
    # @attr_reader [Integer] s3_multipart_threshold (16777216) When uploading
    #   data to S3, if the number of bytes to send exceeds
    #   `:s3_multipart_threshold` then a multi part session is automatically
    #   started and the data is sent up in chunks.  The size of each part
    #   is specified by `:s3_multipart_min_part_size`. Defaults to
    #   16777216 (16MB).
    #
    # @attr_reader [Integer] s3_multipart_min_part_size (5242880)
    #   The absolute minimum size (in bytes) each S3 multipart
    #   segment should be defaults to 5242880 (5MB).
    #
    # @attr_reader [Symbol] s3_server_side_encryption The algorithm to
    #   use when encrypting object data on the server side.  The only
    #   valid value is `:aes256`, which specifies that the object
    #   should be stored using the AES encryption algorithm with 256
    #   bit keys.  Defaults to `nil`, meaning server side encryption
    #   is not used unless specified on each individual call to upload
    #   an object.  This option controls the default behavior for the
    #   following method:
    #
    #     * {S3::S3Object#write}
    #     * {S3::S3Object#multipart_upload}
    #     * {S3::S3Object#copy_from} and {S3::S3Object#copy_to}
    #     * {S3::S3Object#presigned_post}
    #     * {S3::Bucket#presigned_post}
    #
    #   You can construct an interface to Amazon S3 which always
    #   stores data using server side encryption as follows:
    #
    #       s3 = AWS::S3.new(:s3_server_side_encryption => :aes256)
    #
    # @attr_reader [OpenSSL::PKey::RSA, String] s3_encryption_key
    #   If this is set, AWS::S3::S3Object #read and #write methods will always
    #   perform client-side encryption with this key. The key can be overridden
    #   at runtime by using the :encryption_key option.  A value of nil
    #   means that client-side encryption will not be used.
    #
    # @attr_reader [Symbol] s3_encryption_materials_location
    #   When set to `:instruction_file`, AWS::S3::S3Object will store
    #   encryption materials in a separate object, instead of the object
    #   metadata.
    #
    # @attr_reader [Boolean] simple_db_consistent_reads (false) Determines
    #   if all SimpleDB read requests should be done consistently.
    #   Consistent reads are slower, but reflect all changes to SDB.
    #
    # @attr_reader [Boolean] sqs_verify_checksums (true)
    #   When `true` all SQS operations will check body content against
    #   MD5 checksums, raising an exception if there is a mismatch.
    #
    # @attr_reader [CredentialProvider::Provider] credential_provider
    #   Returns the object that is responsible for loading credentials.
    #
    # @attr_reader [String] ssl_ca_file The path to a CA cert bundle in
    #   PEM format.
    #
    #   If `ssl_verify_peer` is true (the default) this bundle will be
    #   used to validate the server certificate in each HTTPS request.
    #   The AWS SDK for Ruby ships with a CA cert bundle, which is the
    #   default value for this option.
    #
    # @attr_reader [String] ssl_ca_path (nil)
    #   The path the a CA cert directory.
    #
    # @attr_reader [String] ssl_cert_store (nil)
    #
    # @attr_reader [Boolean] ssl_verify_peer (true) When `true`
    #   the HTTP handler validate server certificates for HTTPS requests.
    #
    #   This option should only be disabled for diagnostic purposes;
    #   leaving this option set to `false` exposes your application to
    #   man-in-the-middle attacks and can pose a serious security
    #   risk.
    #
    # @attr_reader [Boolean] stub_requests (false) When `true` requests are not
    #   sent to AWS, instead empty responses are generated and returned to
    #   each service request.
    #
    # @attr_reader [Boolean] use_ssl (true) When `true`, all requests
    #   to AWS are sent using HTTPS instead vanilla HTTP.
    #
    # @attr_reader [String] user_agent_prefix (nil) A string prefix to
    #   append to all requests against AWS services.  This should be set
    #   for clients and applications built on top of the aws-sdk gem.
    #
    # @attr_reader [Boolean] verify_response_body_content_length (true)
    #   When `true` all HTTP handlers will perform a check to ensure
    #   that response bodies match the content-length specified in the
    #   response header, if present. Note that some HTTP handlers will
    #   always do this whether or not this value is true.
    #
    class Configuration

      # Creates a new Configuration object.
      # @param options (see AWS.config)
      # @option options (see AWS.config)
      def initialize options = {}

        @created = options.delete(:__created__) || {}

        # :signer is now a deprecated option, this ensures it will still
        # work, but its now preferred to set :credential_provider instead.
        # Credential providers don't have to provide a #sign method.
        if signer = options.delete(:signer)
          options[:credential_provider] = signer
        end

        options.each_pair do |opt_name, value|
          opt_name = opt_name.to_sym
          if self.class.accepted_options.include?(opt_name)
            #if opt_name.to_s =~ /_endpoint$/
            #  warning = ":#{opt_name} is a deprecated AWS configuration option, "
            #  warning << "use :region instead"
            #  warn(warning)
            #end
            supplied[opt_name] = value
          end
        end

      end

      # @return [Hash] Returns a hash with your configured credentials.
      def credentials
        credentials = {}
        [:access_key_id, :secret_access_key, :session_token].each do |opt|
          if value = credential_provider.send(opt)
            credentials[opt] = value
          end
        end
        credentials
      end

      # Used to create a new Configuration object with the given modifications.
      # The current configuration object is not modified.
      #
      #     AWS.config(:max_retries => 2)
      #
      #     no_retries_config = AWS.config.with(:max_retries => 0)
      #
      #     AWS.config.max_retries        #=> 2
      #     no_retries_config.max_retries #=> 0
      #
      # You can use these configuration objects returned by #with to create
      # AWS objects:
      #
      #     AWS::S3.new(:config => no_retries_config)
      #     AWS::SQS.new(:config => no_retries_config)
      #
      # @param options (see AWS.config)
      # @option options (see AWS.config)
      # @return [Configuration] Copies the current configuration and returns
      #   a new one with modifications as provided in `:options`.
      def with options = {}

        # symbolize option keys
        options = options.inject({}) {|h,kv| h[kv.first.to_sym] = kv.last; h }

        values = supplied.merge(options)

        if supplied == values
          self # nothing changed
        else
          self.class.new(values.merge(:__created__ => @created.dup))
        end

      end

      # @return [Hash] Returns a hash of all configuration values.
      def to_h
        self.class.accepted_options.inject({}) do |h,k|
          h.merge(k => send(k))
        end
      end
      alias_method :to_hash, :to_h

      # @return [Boolean] Returns true if the two configuration objects have
      #   the same values.
      def eql? other
        other.is_a?(self.class) and self.supplied == other.supplied
      end
      alias_method :==, :eql?

      # @api private
      def inspect
        "<#{self.class.name}>"
      end

      # @api private
      def endpoint_region(svc)
        (supplied[svc.method_name] || {})[:region] or
        supplied[:"#{svc.old_name}_region"] or
        region
      end

      protected

      def supplied
        @supplied ||= {}
      end

      class << self

        # @api private
        def accepted_options
          @options ||= Set.new
        end

        # @api private
        def add_option name, default_value = nil, options = {}, &transform

          accepted_options << name

          define_method(name) do |&default_override|

            value =
              if supplied.has_key?(name)
                supplied[name]
              elsif default_override
                default_override.call
              else
                default_value
              end

            transform ? transform.call(self, value) : value

          end

          alias_method("#{name}?", name) if options[:boolean]

        end

        # Configuration options that have dependencies are re-recreated
        # anytime one of their dependent configuration values are
        # changed.
        # @api private
        def add_option_with_needs name, needs, &create_block

          accepted_options << name

          define_method(name) do

            return supplied[name] if supplied.has_key?(name)

            needed = needs.inject({}) {|h,need| h.merge(need => send(need)) }

            unless @created.key?(name) and @created[name][:needed] == needed
              created = {}
              created[:object] = create_block.call(self,needed)
              created[:needed] = needed
              @created[name] = created
            end

            @created[name][:object]

          end

        end

        def add_service name, ruby_name, endpoint_prefix

          svc = SERVICES[name]
          svc_opt = svc.method_name
          ruby_name = svc.old_name

          add_option(svc_opt, {})

          add_option :"#{ruby_name}_endpoint" do |config,value|
            region = config.endpoint_region(svc)
            endpoint = value
            endpoint ||= config.send(svc_opt)[:endpoint]
            endpoint ||= Endpoints.hostname(region, endpoint_prefix)
            endpoint ||= "#{endpoint_prefix}.#{region}.amazonaws.com"
            endpoint
          end

          add_option(:"#{ruby_name}_port") do |config,value|
            if value
              value
            elsif port = config.send(svc_opt)[:port]
              port
            else
              config.use_ssl? ? 443 : 80
            end
          end

          # users only need to specify service regions when they use
          # a test endpoint with a sigv4 service
          add_option(:"#{ruby_name}_region") do |config,value|
            if value
              value
            elsif region = config.send(svc_opt)[:region]
              region
            else
              endpoint = config.send("#{ruby_name}_endpoint")
              if endpoint =~ /us-gov/
                if matches = endpoint.match(/(us-gov-west-\d+)/)
                  matches[1]
                else
                  'us-gov-west-1' # e.g. iam.us-gov.amazonaws.com
                end
              elsif matches = endpoint.match(/^.+?[.-](.+)\.amazonaws.com/)
                matches[1]
              else
                AWS.const_get(name).global_endpoint? ? 'us-east-1' : config.region
              end
            end
          end

          needs = [
            :"#{svc_opt}",
            :"#{ruby_name}_endpoint",
            :"#{ruby_name}_port",
            :"#{ruby_name}_region",
            :credential_provider,
            :http_handler,
            :http_read_timeout,
            :http_continue_timeout,
            :http_continue_threshold,
            :log_formatter,
            :log_level,
            :logger,
            :proxy_uri,
            :max_retries,
            :stub_requests?,
            :ssl_verify_peer?,
            :ssl_ca_file,
            :ssl_ca_path,
            :ssl_cert_store,
            :use_ssl?,
            :user_agent_prefix,
          ]

          create_block = lambda do |config,client_options|
            options = client_options[:"#{svc_opt}"]
            AWS.const_get(name)::Client.new(options.merge(:config => config))
          end

          add_option_with_needs :"#{ruby_name}_client", needs, &create_block

        end

      end

      add_option :access_key_id

      add_option :secret_access_key

      add_option :session_token

      add_option :region do |cfg,region|
        region || ENV['AWS_REGION'] || ENV['AMAZON_REGION'] || ENV['AWS_DEFAULT_REGION'] || 'us-east-1'
      end

      add_option_with_needs :credential_provider,
        [:access_key_id, :secret_access_key, :session_token] do |cfg,static_creds|

        CredentialProviders::DefaultProvider.new(static_creds)

      end

      add_option :http_open_timeout, 15

      add_option :http_read_timeout, 60

      add_option :http_continue_timeout, 1

      add_option :http_continue_threshold, false

      add_option :http_idle_timeout, 5

      add_option :http_wire_trace, false, :boolean => true

      add_option_with_needs(:http_handler,
        AWS::Core::Http::ConnectionPool::OPTIONS + [:verify_response_body_content_length]
      ) do |config,options|
        AWS::Core::Http::NetHttpHandler.new(options)
      end

      add_option :logger

      add_option :log_level, :info

      add_option :log_formatter, LogFormatter.default

      add_option :max_retries, 3

      add_option :proxy_uri do |config,uri| uri ? URI.parse(uri.to_s) : nil end

      add_option :ssl_verify_peer, true, :boolean => true

      add_option :ssl_ca_file,
        File.expand_path(File.dirname(__FILE__) + "/../../../ca-bundle.crt")

      add_option :ssl_ca_path

      add_option :ssl_cert_store

      add_option :stub_requests, false, :boolean => true

      add_option :use_ssl, true, :boolean => true

      add_option :user_agent_prefix

      add_option :verify_response_body_content_length, true, :boolean => true

    end
  end
end
