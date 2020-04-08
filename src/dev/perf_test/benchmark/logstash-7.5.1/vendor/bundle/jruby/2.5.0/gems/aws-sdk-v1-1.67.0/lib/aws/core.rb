# Copyright 2011-2014 Amazon.com, Inc. or its affiliates. All Rights Reserved.
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
require 'securerandom'

# AWS is the root module for all of the Amazon Web Services.  It is also
# where you can configure you access to AWS.
#
# # Configuration
#
# Call {AWS.config} with a hash of options to configure your
# access to the Amazon Web Services.
#
# At a minimum you need to set your access credentials. See {AWS.config}
# for additional configuration options.
#
#    AWS.config(
#      :access_key_id => 'ACCESS_KEY_ID',
#      :secret_access_key => 'SECRET_ACCESS_KEY',
#      :region => 'us-west-2')
#
module AWS

  # @api private
  class SvcDetails
    def initialize class_name, options
      @class_name = class_name
      @full_name = options[:full_name]
      @method_name = options[:method_name]
      @method_alias = options[:method_alias]
      @old_name = @method_alias || @method_name
    end
    attr_reader :class_name, :full_name, :method_name, :method_alias, :old_name
  end

  # @api private
  SERVICES = [
    SvcDetails.new("CloudFront",
      :full_name => "Amazon CloudFront",
      :method_name => :cloud_front),
    SvcDetails.new("CloudSearch",
      :full_name => "Amazon CloudSearch",
      :method_name => :cloud_search),
    SvcDetails.new("CloudTrail",
      :full_name => "AWS CloudTrail",
      :method_name => :cloud_trail),
    SvcDetails.new("CloudWatch",
      :full_name => "Amazon CloudWatch",
      :method_name => :cloud_watch),
    SvcDetails.new("DynamoDB",
      :full_name => "Amazon DynamoDB",
      :method_name => :dynamo_db),
    SvcDetails.new("EC2",
      :full_name => "Amazon Elastic Compute Cloud",
      :method_name => :ec2),
    SvcDetails.new("EMR",
      :full_name => "Amazon Elastic MapReduce",
      :method_name => :emr),
    SvcDetails.new("ElastiCache",
      :full_name => "Amazon ElastiCache",
      :method_name => :elasticache),
    SvcDetails.new("Glacier",
      :full_name => "Amazon Glacier",
      :method_name => :glacier),
    SvcDetails.new("RDS",
      :full_name => "Amazon Relational Database Service (Beta)",
      :method_name => :rds),
    SvcDetails.new("Route53",
      :full_name => "Amazon Route 53",
      :method_name => :route_53),
    SvcDetails.new("SimpleEmailService",
      :full_name => "Amazon Simple E-mail Service",
      :method_name => :ses,
      :method_alias => :simple_email_service),
    SvcDetails.new("SNS",
      :full_name => "Amazon Simple Notifications Service",
      :method_name => :sns),
    SvcDetails.new("SQS",
      :full_name => "Amazon Simple Queue Service",
      :method_name => :sqs),
    SvcDetails.new("SimpleWorkflow",
      :full_name => "Amazon Simple Workflow Service",
      :method_name => :swf,
      :method_alias => :simple_workflow),
    SvcDetails.new("SimpleDB",
      :full_name => "Amazon SimpleDB",
      :method_name => :simple_db),
    SvcDetails.new("AutoScaling",
      :full_name => "Auto Scaling",
      :method_name => :auto_scaling),
    SvcDetails.new("CloudFormation",
      :full_name => "AWS CloudFormation",
      :method_name => :cloud_formation),
    SvcDetails.new("DataPipeline",
      :full_name => "AWS Data Pipeline",
      :method_name => :data_pipeline),
    SvcDetails.new("DirectConnect",
      :full_name => "AWS Direct Connect",
      :method_name => :direct_connect),
    SvcDetails.new("ElasticBeanstalk",
      :full_name => "AWS Elastic Beanstalk",
      :method_name => :elastic_beanstalk),
    SvcDetails.new("IAM",
      :full_name => "AWS Identity and Access Management",
      :method_name => :iam),
    SvcDetails.new("ImportExport",
      :full_name => "AWS Import/Export",
      :method_name => :import_export),
    SvcDetails.new("Kinesis",
      :full_name => "Amazon Kinesis",
      :method_name => :kinesis),
    SvcDetails.new("OpsWorks",
      :full_name => "AWS OpsWorks",
      :method_name => :ops_works),
    SvcDetails.new("STS",
      :full_name => "AWS Security Token Service",
      :method_name => :sts),
    SvcDetails.new("StorageGateway",
      :full_name => "AWS Storage Gateway",
      :method_name => :storage_gateway),
    SvcDetails.new("Support",
      :full_name => "AWS Support",
      :method_name => :support),
    SvcDetails.new("ELB",
      :full_name => "Elastic Load Balancing",
      :method_name => :elb),
    SvcDetails.new("ElasticTranscoder",
      :full_name => "Amazon Elastic Transcoder",
      :method_name => :elastic_transcoder),
    SvcDetails.new("Redshift",
      :full_name => "Amazon Redshift",
      :method_name => :redshift),
    SvcDetails.new("S3",
      :full_name => "Amazon Simple Storage Service",
      :method_name => :s3)
  ].inject({}) { |h,svc| h[svc.class_name] = svc; h }

  # @api private
  ROOT = File.expand_path(File.join(File.dirname(__FILE__), '..', '..'))

  SRC = ROOT + '/lib/aws'

  autoload :Errors, "#{SRC}/errors"
  autoload :Record, "#{SRC}/record"
  autoload :VERSION, "#{SRC}/version"

  module Core

    autoload :AsyncHandle, "#{SRC}/core/async_handle"
    autoload :Cacheable, "#{SRC}/core/cacheable"
    autoload :Client, "#{SRC}/core/client"
    autoload :Collection, "#{SRC}/core/collection"
    autoload :Configuration, "#{SRC}/core/configuration"
    autoload :CredentialProviders, "#{SRC}/core/credential_providers"
    autoload :Data, "#{SRC}/core/data"
    autoload :Deprecations, "#{SRC}/core/deprecations"
    autoload :Endpoints, "#{SRC}/core/endpoints"
    autoload :IndifferentHash, "#{SRC}/core/indifferent_hash"
    autoload :Inflection, "#{SRC}/core/inflection"
    autoload :IniParser, "#{SRC}/core/ini_parser"
    autoload :JSONParser, "#{SRC}/core/json_parser"

    autoload :JSONClient, "#{SRC}/core/json_client"
    autoload :JSONRequestBuilder, "#{SRC}/core/json_request_builder"
    autoload :JSONResponseParser, "#{SRC}/core/json_response_parser"

    autoload :LazyErrorClasses, "#{SRC}/core/lazy_error_classes"
    autoload :LogFormatter, "#{SRC}/core/log_formatter"
    autoload :MetaUtils, "#{SRC}/core/meta_utils"
    autoload :ManagedFile, "#{SRC}/core/managed_file"
    autoload :Model, "#{SRC}/core/model"
    autoload :Naming, "#{SRC}/core/naming"
    autoload :OptionGrammar, "#{SRC}/core/option_grammar"
    autoload :PageResult, "#{SRC}/core/page_result"
    autoload :Policy, "#{SRC}/core/policy"

    autoload :QueryClient, "#{SRC}/core/query_client"
    autoload :QueryRequestBuilder, "#{SRC}/core/query_request_builder"
    autoload :QueryResponseParser, "#{SRC}/core/query_response_parser"

    autoload :Region, "#{SRC}/core/region"
    autoload :RegionCollection, "#{SRC}/core/region_collection"

    autoload :Resource, "#{SRC}/core/resource"
    autoload :ResourceCache, "#{SRC}/core/resource_cache"
    autoload :Response, "#{SRC}/core/response"
    autoload :ResponseCache, "#{SRC}/core/response_cache"

    autoload :RESTClient, "#{SRC}/core/rest_xml_client"
    autoload :RESTJSONClient, "#{SRC}/core/rest_json_client"
    autoload :RESTXMLClient, "#{SRC}/core/rest_xml_client"
    autoload :RESTRequestBuilder, "#{SRC}/core/rest_request_builder"
    autoload :RESTResponseParser, "#{SRC}/core/rest_response_parser"

    autoload :ServiceInterface, "#{SRC}/core/service_interface"
    autoload :UriEscape, "#{SRC}/core/uri_escape"

    module Options
      autoload :JSONSerializer, "#{SRC}/core/options/json_serializer"
      autoload :XMLSerializer, "#{SRC}/core/options/xml_serializer"
      autoload :Validator, "#{SRC}/core/options/validator"
    end

    module Signers
      autoload :Base, "#{SRC}/core/signers/base"
      autoload :CloudFront, "#{SRC}/core/signers/cloud_front"
      autoload :S3, "#{SRC}/core/signers/s3"
      autoload :Version2, "#{SRC}/core/signers/version_2"
      autoload :Version3, "#{SRC}/core/signers/version_3"
      autoload :Version3Https, "#{SRC}/core/signers/version_3_https"
      autoload :Version4, "#{SRC}/core/signers/version_4"
    end

    module XML

      autoload :Parser, "#{SRC}/core/xml/parser"
      autoload :Grammar, "#{SRC}/core/xml/grammar"
      autoload :Stub, "#{SRC}/core/xml/stub"
      autoload :Frame, "#{SRC}/core/xml/frame"
      autoload :RootFrame, "#{SRC}/core/xml/root_frame"
      autoload :FrameStack, "#{SRC}/core/xml/frame_stack"

      module SaxHandlers
        autoload :Nokogiri, "#{SRC}/core/xml/sax_handlers/nokogiri"
        autoload :REXML, "#{SRC}/core/xml/sax_handlers/rexml"
      end

    end

    module Http
      autoload :ConnectionPool, "#{SRC}/core/http/connection_pool"
      autoload :Handler, "#{SRC}/core/http/handler"
      autoload :NetHttpHandler, "#{SRC}/core/http/net_http_handler"
      autoload :Request, "#{SRC}/core/http/request"
      autoload :Response, "#{SRC}/core/http/response"
    end

  end

  class << self

    SERVICES.values.each do |svc|
      define_method(svc.method_name) do |*args|
        AWS.const_get(svc.class_name).new(args.first || {})
      end
      alias_method(svc.method_alias, svc.method_name) if svc.method_alias
    end

    # @api private
    @@config = nil

    # The global configuration for AWS.  Generally you set your preferred
    # configuration operations once after loading the aws-sdk gem.
    #
    #     AWS.config({
    #       :access_key_id => 'ACCESS_KEY_ID',
    #       :secret_access_key => 'SECRET_ACCESS_KEY',
    #       :region => 'us-west-2',
    #     })
    #
    # When using AWS classes they will always default to use configuration
    # values defined in {AWS.config}.
    #
    #     AWS.config(:max_retries => 2)
    #
    #     sqs = AWS::SQS.new
    #     sqs.config.max_retries #=> 2
    #
    # If you want to change a configuration value for a single instance you
    # pass the new configuration value to that object's initializer:
    #
    #     AWS::SQS.new(:max_retries => 0)
    #
    # @note Changing the global configuration does not affect objects
    #   that have already been constructed.
    #
    # @param [Hash] options
    #
    # @option options [String] :access_key_id AWS access key id
    #   credential.
    #
    # @option options [String] :secret_access_key AWS secret access
    #   key credential.
    #
    # @option options [String,nil] :session_token AWS secret token
    #   credential.
    #
    # @option options [String] :region ('us-east-1') The default AWS region.
    #
    # @option options [Boolean] :dynamo_db_big_decimals (true) When `true`,
    #   {DynamoDB} will convert number values returned by {DynamoDB::Client}
    #   from strings to BigDecimal objects.  If you set this to `false`,
    #   they will be converted from strings into floats (with a potential
    #   loss of precision).
    #
    # @option options [Boolean] :dynamo_db_retry_throughput_errors (true) When
    #   true, AWS::DynamoDB::Errors::ProvisionedThroughputExceededException
    #   errors will be retried.
    #
    # @option options [Object] :http_handler (AWS::Core::Http::NetHttpHandler)
    #   The http handler that sends requests to AWS.
    #
    # @option options [Integer] :http_idle_timeout (60) The number of seconds
    #   a persistent connection is allowed to sit idle before it should no
    #   longer be used.
    #
    # @option options [Integer] :http_open_timeout (15) The number of seconds
    #   before the `:http_handler` should timeout while trying to open a new
    #   HTTP session.
    #
    # @option options [Integer] :http_read_timeout (60) The number of seconds
    #   before the `:http_handler` should timeout while waiting for a HTTP
    #   response.
    #
    # @option options [Boolean] :http_wire_trace (false) When `true`, the
    #   http handler will log all wire traces to the `:logger`.  If a
    #   `:logger` is not configured, then wire traces will be sent to
    #   standard out.
    #
    # @option options [Logger,nil] :logger (nil) A logger to send
    #   log messages to.  Here is an example that logs to standard out.
    #
    #       require 'logger'
    #       AWS.config(:logger => Logger.new($stdout))
    #
    # @option options [Symbol] :log_level (:info) The level log messages are
    #   sent to the logger with (e.g. `:notice`, `:info`, `:warn`,
    #   `:debug`, etc).
    #
    # @option options [Object] :log_formatter The log formatter is responsible
    #   for building log messages from responses. You can quickly change
    #   log formats by providing a pre-configured log formatter.
    #
    #       AWS.config(:log_formatter => AWS::Core::LogFormatter.colored)
    #
    #   Here is a list of pre-configured log formatters:
    #
    #     * `AWS::Core::LogFormatter.default`
    #     * `AWS::Core::LogFormatter.short`
    #     * `AWS::Core::LogFormatter.debug`
    #     * `AWS::Core::LogFormatter.colored`
    #
    #   You can also create an instance of AWS::Core::LogFormatter
    #   with a custom log message pattern. See {Core::LogFormatter} for
    #   a complete list of pattern substitutions.
    #
    #       pattern = "[AWS :operation :duration] :error_message"
    #       AWS.config(:log_formatter => AWS::Core::LogFormatter.new(pattern))
    #
    #   Lastly you can pass any object that responds to `#format` accepting
    #   and instance of {Core::Response} and returns a string.
    #
    # @option options [Integer] :max_retries (3) The maximum number of times
    #   service errors (500) and throttling errors should be retried. There is
    #   an exponential backoff in between retries, so the more retries the
    #   longer it can take to fail.
    #
    # @option options [String, URI, nil] :proxy_uri (nil) The URI of the proxy
    #    to send service requests through.  You can pass a URI object or a
    #    URI string:
    #
    #        AWS.config(:proxy_uri => 'https://user:password@my.proxy:443/path?query')
    #
    # @option options [Boolean] :s3_force_path_style (false) When
    #   `true`, requests will always use path style.  This can be useful
    #   for testing environments.
    #
    # @option options [Integer] :s3_multipart_max_parts (10000) The maximum
    #   number of parts to split a file into when uploading in parts to S3.
    #
    # @option options [Integer] :s3_multipart_threshold (16777216) When
    #   uploading data to S3, if the number of bytes to send exceeds
    #   `:s3_multipart_threshold` then a multi part session is automatically
    #   started and the data is sent up in chunks.  The size of each part
    #   is specified by `:s3_multipart_min_part_size`. Defaults to
    #   16777216 (16MB).
    #
    # @option options [Integer] :s3_multipart_min_part_size (5242880) The
    #   absolute minimum size (in bytes) each S3 multipart segment should be.
    #   Defaults to 5242880 (5MB).
    #
    # @option options [Symbol] :s3_server_side_encryption (nil) The
    #   algorithm to use when encrypting object data on the server
    #   side.  The only valid value is `:aes256`, which specifies that
    #   the object should be stored using the AES encryption algorithm
    #   with 256 bit keys.  Defaults to `nil`, meaning server side
    #   encryption is not used unless specified on each individual
    #   call to upload an object.  This option controls the default
    #   behavior for the following methods:
    #
    #     * {S3::S3Object#write}
    #     * {S3::S3Object#multipart_upload}
    #     * {S3::S3Object#copy_from} and {S3::S3Object#copy_to}
    #     * {S3::S3Object#presigned_post}
    #     * {S3::Bucket#presigned_post}
    #
    # @option options [OpenSSL::PKey::RSA, String] :s3_encryption_key (nil)
    #   If this is set, AWS::S3::S3Object #read and #write methods will always
    #   perform client-side encryption with this key. The key can be overridden
    #   at runtime by using the :encryption_key option.  A value of nil
    #   means that client-side encryption will not be used.
    #
    # @option options [Symbol] :s3_encryption_materials_location (:metadata)
    #   When set to `:instruction_file`, AWS::S3::S3Object will store
    #   encryption materials in a separate object, instead of the object
    #   metadata.
    #
    # @option options [Boolean] :simple_db_consistent_reads (false) Determines
    #   if all SimpleDB read requests should be done consistently.
    #   Consistent reads are slower, but reflect all changes to SDB.
    #
    # @option options [CredentialProviders::Provider] :credential_provider (AWS::Core::CredentialProviders::DefaultProvider.new)
    #   Returns the credential provider.  The default credential provider
    #   attempts to check for statically assigned credentials, ENV credentials
    #   and credentials in the metadata service of EC2.
    #
    # @option options [String] :ssl_ca_file The path to a CA cert bundle in
    #   PEM format.
    #
    #   If `:ssl_verify_peer` is `true` (the default) this bundle will be
    #   used to validate the server certificate in each HTTPS request.
    #   The AWS SDK for Ruby ships with a CA cert bundle, which is the
    #   default value for this option.
    #
    # @option options [String] :ssl_ca_path (nil)
    #   The path the a CA cert directory.
    #
    # @option options [Boolean] :ssl_verify_peer (true) When `true`
    #   the HTTP handler validate server certificates for HTTPS requests.
    #
    #   This option should only be disabled for diagnostic purposes;
    #   leaving this option set to `false` exposes your application to
    #   man-in-the-middle attacks and can pose a serious security
    #   risk.
    #
    # @option options [Boolean] :stub_requests (false) When `true` requests
    #   are not sent to AWS, instead empty responses are generated and
    #   returned to each service request.
    #
    # @option options [Boolean] :use_ssl (true) When `true`, all requests
    #   to AWS are sent using HTTPS instead vanilla HTTP.
    #
    # @option options [String] :user_agent_prefix (nil) A string prefix to
    #   append to all requests against AWS services.  This should be set
    #   for clients and applications built ontop of the aws-sdk gem.
    #
    # @option options [Boolean] :verify_response_body_content_length (true)
    #   When `true` all HTTP handlers will perform a check to ensure
    #   that response bodies match the content-length specified in the
    #   response header, if present. Note that some HTTP handlers will
    #   always do this whether or not this value is true.
    #
    # @option options [Boolean] :sqs_verify_checksums (true)
    #   When `true` all SQS operations will check body content against
    #   MD5 checksums, raising an exception if there is a mismatch.
    #
    # @return [Core::Configuration] Returns the new configuration.
    #
    def config options = {}
      @@config ||= Core::Configuration.new
      @@config = @@config.with(options) unless options.empty?
      @@config
    end

    # Returns a collection that represents public (non-gov-cloud) AWS
    # regions.  You can use this collection to get a specific region by name
    # or to enumerate all regions.
    #
    # When enumerating regions, a single HTTP request is made to get a current
    # list of regions (this is cached).  When getting a region by name
    # no requests are made.
    #
    # @example Getting a region by name
    #
    #   region = AWS.regions['us-west-1']
    #   region.dynamo_db.tables.map(&:name)
    #
    # @example Enumerating all regions
    #
    #   AWS.regions.each do |region|
    #     puts "EC2 Instances in #{region.name}:"
    #     puts region.ec2.instances.map(&:id)
    #   end
    #
    # @return [Core::RegionCollection]
    def regions
      Core::RegionCollection.new
    end

    # @note Memoization is currently only supported for APIs which
    #   inherit from the "Resource" class; other APIs are unaffected
    #   by the status of memoization.
    #
    # Resets memoizing service requests made in the current thread.
    # See {memoize} for a full discussion of the memoization feature.
    # This has no effect if memoization is already enabled.
    def reset_memoization
      Thread.current[:aws_memoization] = {}
    end

    # @note Memoization is currently only supported for APIs which
    #   inherit from the "Resource" class; other APIs are unaffected
    #   by the status of memoization.
    #
    # Starts memoizing service requests made in the current thread.
    # See {memoize} for a full discussion of the memoization feature.
    # This has no effect if memoization is already enabled.
    def start_memoizing
      Thread.current[:aws_memoization] ||= {}
      nil
    end

    # @note Memoization is currently only supported for APIs which
    #   inherit from the "Resource" class; other APIs are unaffected
    #   by the status of memoization.
    #
    # Stops memoizing service requests made in the current thread.
    # See {memoize} for a full discussion of the memoization feature.
    # This has no effect if memoization is already disabled.
    def stop_memoizing
      Thread.current[:aws_memoization] = nil
    end

    # @note Memoization is currently only supported for APIs which
    #   inherit from the "Resource" class; other APIs are unaffected
    #   by the status of memoization.
    #
    # @return [Boolean] True if memoization is enabled for the current
    #   thread.  See {memoize} for a full discussion of the
    #   memoization feature.
    def memoizing?
      !Thread.current[:aws_memoization].nil?
    end

    # @note Memoization is currently only supported for APIs which
    #   inherit from the "Resource" class; other APIs are unaffected
    #   by the status of memoization.
    #
    # Enables memoization for the current thread, within a block.
    # Memoization lets you avoid making multiple requests for the same
    # data by reusing the responses which have already been received.
    # For example, consider the following code to get the most
    # recently launched EC2 instance:
    #
    #     latest = ec2.instances.sort_by(&:launch_time).last
    #
    # The above code would make N+1 requests (where N is the number of
    # instances in the account); iterating the collection of instances
    # is one request, and `Enumerable#sort_by` calls
    # {AWS::EC2::Instance#launch_time} for each instance, causing
    # another request per instance.  We can rewrite the code as
    # follows to make only one request:
    #
    #     latest = AWS.memoize do
    #       ec2.instances.sort_by(&:launch_time).last
    #     end
    #
    # Iterating the collection still causes a request, but each
    # subsequent call to {AWS::EC2::Instance#launch_time} uses the
    # results from that first request rather than making a new request
    # for the same data.
    #
    # While memoization is enabled, every response that is received
    # from the service is retained in memory.  Therefore you should
    # use memoization only for short-lived blocks of code that make
    # relatively small numbers of requests.  The cached responses are
    # used in two ways while memoization is enabled:
    #
    #   * Before making a request, the SDK checks the cache for a
    #     response to a request with the same signature (credentials,
    #     service endpoint, operation name, and parameters).  If such a
    #     response is found, it is used instead of making a new
    #     request.
    #
    #   * Before retrieving data for an attribute of a resource
    #     (e.g. {AWS::EC2::Instance#launch_time}), the SDK attempts to
    #     find a cached response that contains the requested data.  If
    #     such a response is found, the cached data is returned instead
    #     of making a new request.
    #
    # When memoization is disabled, all previously cached responses
    # are discarded.
    def memoize
      return yield if memoizing?
      begin
        start_memoizing
        yield if block_given?
      ensure
        stop_memoizing
      end
    end

    # @api private
    def resource_cache
      if memoizing?
        Thread.current[:aws_memoization][:resource_cache] ||=
          Core::ResourceCache.new
      end
    end

    # @api private
    def response_cache
      if memoizing?
        Thread.current[:aws_memoization][:response_cache] ||=
          Core::ResponseCache.new
      end
    end

    # Causes all requests to return empty responses without making any
    # requests against the live services.  This does not attempt to
    # mock the services.
    # @return [nil]
    def stub!
      config(:stub_requests => true)
      nil
    end

    # Eagerly loads all AWS classes/modules registered with autoload.
    # @return [void]
    def eager_autoload! klass_or_module = AWS, visited = Set.new
      klass_or_module.constants.each do |const_name|
        path = klass_or_module.autoload?(const_name)
        require(path) if path
        const = klass_or_module.const_get(const_name)
        if const.is_a?(Module)
          unless visited.include?(const)
            visited << const
            eager_autoload!(const, visited)
          end
        end
      end
      visited
    end

    # Now deprecated, as the SDK will always patch Net::HTTP when loaded.
    # @api private
    def patch_net_http_100_continue!
      nil
    end

    # @api private
    # @return [Hash]
    def api_versions
      @versions ||= begin
        # get a list of support services/apis from disk
        versions = {}
        pattern = File.join(File.dirname(__FILE__), 'api_config', '*.yml')
        Dir.glob(pattern).each do |path|
          path.match(/(\w+)-(\d{4}-\d{2}-\d{2})/)
          svc = SERVICES[$1].full_name
          versions[svc] ||= []
          versions[svc] << $2
        end

        # s3 does not have an API configuration, so we have to add it manually
        versions[SERVICES['S3'].full_name] = ['2006-03-01']

        # sort the services alphabetically
        versions.keys.sort_by(&:downcase).inject({}) do |hash,svc|
          hash[svc] = versions[svc]
          hash
        end
      end
    end
  end

  SERVICES.values.each do |svc|
    autoload(svc.class_name, "aws/#{svc.old_name}")
    require "aws/#{svc.old_name}/config"
  end

end

# Backport SecureRandom.uuid for Ruby 1.8
unless SecureRandom.respond_to?(:uuid)
  module SecureRandom
    def self.uuid
      ary = random_bytes(16).unpack("NnnnnN")
      ary[2] = (ary[2] & 0x0fff) | 0x4000
      ary[3] = (ary[3] & 0x3fff) | 0x8000
      "%08x-%04x-%04x-%04x-%04x%08x" % ary
    end
  end
end

require 'aws/core/http/patch'
AWS::Core::Http::Patches.apply!
