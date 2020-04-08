require 'jmespath'
require 'seahorse'
require_relative 'aws-sdk-core/structure'
require_relative 'aws-sdk-core/empty_structure'

Seahorse::Util.irregular_inflections({
  'ARNs' => 'arns',
  'CNAMEs' => 'cnames',
  'Ec2' => 'ec2',
  'ElastiCache' => 'elasticache',
  'iSCSI' => 'iscsi',
  'ACLs' => 'acls',
  'HIT' => 'hit',
  'URL' => 'url'
  #'SSEKMS' => 'sse_kms',
})

module Aws

  # @api private
  API_DIR = File.join(File.dirname(File.dirname(__FILE__)), 'apis')

  # @api private
  # services
  SERVICE_MODULE_NAMES = %w(
    ACM
    ACMPCA
    APIGateway
    AccessAnalyzer
    AlexaForBusiness
    Amplify
    ApiGatewayManagementApi
    ApiGatewayV2
    AppConfig
    AppMesh
    AppStream
    AppSync
    ApplicationAutoScaling
    ApplicationDiscoveryService
    ApplicationInsights
    Athena
    AugmentedAIRuntime
    AutoScaling
    AutoScalingPlans
    Backup
    Batch
    Budgets
    Chime
    Cloud9
    CloudDirectory
    CloudFormation
    CloudFront
    CloudHSM
    CloudHSMV2
    CloudSearch
    CloudSearchDomain
    CloudTrail
    CloudWatch
    CloudWatchEvents
    CloudWatchLogs
    CodeBuild
    CodeCommit
    CodeDeploy
    CodeGuruProfiler
    CodeGuruReviewer
    CodePipeline
    CodeStar
    CodeStarNotifications
    CognitoIdentity
    CognitoIdentityProvider
    CognitoSync
    Comprehend
    ComprehendMedical
    ComputeOptimizer
    ConfigService
    Connect
    ConnectParticipant
    CostExplorer
    CostandUsageReportService
    DAX
    DLM
    DataExchange
    DataPipeline
    DataSync
    DatabaseMigrationService
    DeviceFarm
    DirectConnect
    DirectoryService
    DocDB
    DynamoDB
    DynamoDBStreams
    EBS
    EC2
    EC2InstanceConnect
    ECR
    ECS
    EFS
    EKS
    EMR
    ElastiCache
    ElasticBeanstalk
    ElasticInference
    ElasticLoadBalancing
    ElasticLoadBalancingV2
    ElasticTranscoder
    ElasticsearchService
    EventBridge
    FMS
    FSx
    Firehose
    ForecastQueryService
    ForecastService
    FraudDetector
    GameLift
    Glacier
    GlobalAccelerator
    Glue
    Greengrass
    GroundStation
    GuardDuty
    Health
    IAM
    Imagebuilder
    ImportExport
    Inspector
    IoT
    IoT1ClickDevicesService
    IoT1ClickProjects
    IoTAnalytics
    IoTDataPlane
    IoTEvents
    IoTEventsData
    IoTJobsDataPlane
    IoTSecureTunneling
    IoTThingsGraph
    KMS
    Kafka
    Kendra
    Kinesis
    KinesisAnalytics
    KinesisAnalyticsV2
    KinesisVideo
    KinesisVideoArchivedMedia
    KinesisVideoMedia
    KinesisVideoSignalingChannels
    LakeFormation
    Lambda
    LambdaPreview
    Lex
    LexModelBuildingService
    LicenseManager
    Lightsail
    MQ
    MTurk
    MachineLearning
    Macie
    ManagedBlockchain
    MarketplaceCatalog
    MarketplaceCommerceAnalytics
    MarketplaceEntitlementService
    MarketplaceMetering
    MediaConnect
    MediaConvert
    MediaLive
    MediaPackage
    MediaPackageVod
    MediaStore
    MediaStoreData
    MediaTailor
    MigrationHub
    MigrationHubConfig
    Mobile
    Neptune
    NetworkManager
    OpsWorks
    OpsWorksCM
    Organizations
    Outposts
    PI
    Personalize
    PersonalizeEvents
    PersonalizeRuntime
    Pinpoint
    PinpointEmail
    PinpointSMSVoice
    Polly
    Pricing
    QLDB
    QLDBSession
    QuickSight
    RAM
    RDS
    RDSDataService
    Redshift
    Rekognition
    ResourceGroups
    ResourceGroupsTaggingAPI
    RoboMaker
    Route53
    Route53Domains
    Route53Resolver
    S3
    S3Control
    SES
    SESV2
    SMS
    SNS
    SQS
    SSM
    SSO
    SSOOIDC
    STS
    SWF
    SageMaker
    SageMakerRuntime
    SavingsPlans
    Schemas
    SecretsManager
    SecurityHub
    ServerlessApplicationRepository
    ServiceCatalog
    ServiceDiscovery
    ServiceQuotas
    Shield
    Signer
    SimpleDB
    Snowball
    States
    StorageGateway
    Support
    Textract
    TranscribeService
    Transfer
    Translate
    WAF
    WAFRegional
    WAFV2
    WorkDocs
    WorkLink
    WorkMail
    WorkMailMessageFlow
    WorkSpaces
    XRay
  )
  # end services

  @config = {}
  @services = {}
  @service_added_callbacks = []

  SERVICE_MODULE_NAMES.each do |const_name|
    autoload const_name, "aws-sdk-core/#{const_name.downcase}"
  end

  autoload :AssumeRoleCredentials, 'aws-sdk-core/assume_role_credentials'
  autoload :Checksums, 'aws-sdk-core/checksums'
  autoload :Client, 'aws-sdk-core/client'
  autoload :ClientStubs, 'aws-sdk-core/client_stubs'
  autoload :ClientWaiters, 'aws-sdk-core/client_waiters'
  autoload :CredentialProvider, 'aws-sdk-core/credential_provider'
  autoload :CredentialProviderChain, 'aws-sdk-core/credential_provider_chain'
  autoload :Credentials, 'aws-sdk-core/credentials'
  autoload :Deprecations, 'aws-sdk-core/deprecations'
  autoload :EagerLoader, 'aws-sdk-core/eager_loader'
  autoload :ECSCredentials, 'aws-sdk-core/ecs_credentials'
  autoload :EndpointProvider, 'aws-sdk-core/endpoint_provider'
  autoload :EndpointCache, 'aws-sdk-core/endpoint_cache'
  autoload :Errors, 'aws-sdk-core/errors'
  autoload :IniParser, 'aws-sdk-core/ini_parser'
  autoload :InstanceProfileCredentials, 'aws-sdk-core/instance_profile_credentials'
  autoload :Json, 'aws-sdk-core/json'
  autoload :PageableResponse, 'aws-sdk-core/pageable_response'
  autoload :Pager, 'aws-sdk-core/pager'
  autoload :ParamConverter, 'aws-sdk-core/param_converter'
  autoload :ParamValidator, 'aws-sdk-core/param_validator'
  autoload :Partitions, 'aws-sdk-core/partitions'
  autoload :RefreshingCredentials, 'aws-sdk-core/refreshing_credentials'
  autoload :Service, 'aws-sdk-core/service'
  autoload :SharedConfig, 'aws-sdk-core/shared_config'
  autoload :SharedCredentials, 'aws-sdk-core/shared_credentials'
  autoload :TreeHash, 'aws-sdk-core/tree_hash'
  autoload :TypeBuilder, 'aws-sdk-core/type_builder'
  autoload :VERSION, 'aws-sdk-core/version'

  # @api private
  module Api
    autoload :Builder, 'aws-sdk-core/api/builder'
    autoload :Customizations, 'aws-sdk-core/api/customizations'
    autoload :ShapeMap, 'aws-sdk-core/api/shape_map'
    module Docs
      autoload :Builder, 'aws-sdk-core/api/docs/builder'
      autoload :ClientTypeDocumenter, 'aws-sdk-core/api/docs/client_type_documenter'
      autoload :Crosslink, 'aws-sdk-core/api/docs/crosslink'
      autoload :DocstringProvider, 'aws-sdk-core/api/docs/docstring_provider'
      autoload :NullDocstringProvider, 'aws-sdk-core/api/docs/docstring_provider'
      autoload :OperationDocumenter, 'aws-sdk-core/api/docs/operation_documenter'
      autoload :ParamFormatter, 'aws-sdk-core/api/docs/param_formatter'
      autoload :RequestSyntaxExample, 'aws-sdk-core/api/docs/request_syntax_example'
      autoload :ResponseStructureExample, 'aws-sdk-core/api/docs/response_structure_example'
      autoload :SharedExample, 'aws-sdk-core/api/docs/shared_example'
      autoload :Utils, 'aws-sdk-core/api/docs/utils'
    end
  end

  module Log
    autoload :Formatter, 'aws-sdk-core/log/formatter'
    autoload :ParamFilter, 'aws-sdk-core/log/param_filter'
    autoload :ParamFormatter, 'aws-sdk-core/log/param_formatter'
  end

  module Plugins
    autoload :APIGatewayHeader, 'aws-sdk-core/plugins/api_gateway_header'
    autoload :CSDConditionalSigning, 'aws-sdk-core/plugins/csd_conditional_signing'
    autoload :CSDSwitchToPost, 'aws-sdk-core/plugins/csd_switch_to_post'
    autoload :DynamoDBExtendedRetries, 'aws-sdk-core/plugins/dynamodb_extended_retries'
    autoload :DynamoDBSimpleAttributes, 'aws-sdk-core/plugins/dynamodb_simple_attributes'
    autoload :DynamoDBCRC32Validation, 'aws-sdk-core/plugins/dynamodb_crc32_validation'
    autoload :EC2CopyEncryptedSnapshot, 'aws-sdk-core/plugins/ec2_copy_encrypted_snapshot'
    autoload :EC2RegionValidation, 'aws-sdk-core/plugins/ec2_region_validation'
    autoload :GlacierAccountId, 'aws-sdk-core/plugins/glacier_account_id'
    autoload :GlacierApiVersion, 'aws-sdk-core/plugins/glacier_api_version'
    autoload :GlacierChecksums, 'aws-sdk-core/plugins/glacier_checksums'
    autoload :GlobalConfiguration, 'aws-sdk-core/plugins/global_configuration'
    autoload :HelpfulSocketErrors, 'aws-sdk-core/plugins/helpful_socket_errors'
    autoload :IdempotencyToken, 'aws-sdk-core/plugins/idempotency_token'
    autoload :JsonvalueConverter, 'aws-sdk-core/plugins/jsonvalue_converter'
    autoload :EndpointDiscovery, 'aws-sdk-core/plugins/endpoint_discovery'
    autoload :EndpointPattern, 'aws-sdk-core/plugins/endpoint_pattern'
    autoload :Logging, 'aws-sdk-core/plugins/logging'
    autoload :MachineLearningPredictEndpoint, 'aws-sdk-core/plugins/machine_learning_predict_endpoint'
    autoload :ParamConverter, 'aws-sdk-core/plugins/param_converter'
    autoload :ParamValidator, 'aws-sdk-core/plugins/param_validator'
    autoload :RDSCrossRegionCopying, 'aws-sdk-core/plugins/rds_cross_region_copying'
    autoload :RegionalEndpoint, 'aws-sdk-core/plugins/regional_endpoint'
    autoload :ResponsePaging, 'aws-sdk-core/plugins/response_paging'
    autoload :RequestSigner, 'aws-sdk-core/plugins/request_signer'
    autoload :RetryErrors, 'aws-sdk-core/plugins/retry_errors'
    autoload :Route53IdFix, 'aws-sdk-core/plugins/route_53_id_fix'
    autoload :S3ControlDns, 'aws-sdk-core/plugins/s3_control_dns'
    autoload :S3ControlDualstack, 'aws-sdk-core/plugins/s3_control_dualstack'
    autoload :S3ControlSigner, 'aws-sdk-core/plugins/s3_control_signer'
    autoload :S3Accelerate, 'aws-sdk-core/plugins/s3_accelerate'
    autoload :S3BucketDns, 'aws-sdk-core/plugins/s3_bucket_dns'
    autoload :S3BucketNameRestrictions, 'aws-sdk-core/plugins/s3_bucket_name_restrictions'
    autoload :S3Dualstack, 'aws-sdk-core/plugins/s3_dualstack'
    autoload :S3Expect100Continue, 'aws-sdk-core/plugins/s3_expect_100_continue'
    autoload :S3GetBucketLocationFix, 'aws-sdk-core/plugins/s3_get_bucket_location_fix'
    autoload :S3Http200Errors, 'aws-sdk-core/plugins/s3_http_200_errors'
    autoload :S3HostId, 'aws-sdk-core/plugins/s3_host_id'
    autoload :S3LocationConstraint, 'aws-sdk-core/plugins/s3_location_constraint'
    autoload :S3Md5s, 'aws-sdk-core/plugins/s3_md5s'
    autoload :S3Redirects, 'aws-sdk-core/plugins/s3_redirects'
    autoload :S3RequestSigner, 'aws-sdk-core/plugins/s3_request_signer'
    autoload :S3SseCpk, 'aws-sdk-core/plugins/s3_sse_cpk'
    autoload :S3UrlEncodedKeys, 'aws-sdk-core/plugins/s3_url_encoded_keys'
    autoload :STSRegionalEndpoints, 'aws-sdk-core/plugins/sts_regional_endpoints'
    autoload :SQSQueueUrls, 'aws-sdk-core/plugins/sqs_queue_urls'
    autoload :SQSMd5s, 'aws-sdk-core/plugins/sqs_md5s'
    autoload :StubResponses, 'aws-sdk-core/plugins/stub_responses'
    autoload :SWFReadTimeouts, 'aws-sdk-core/plugins/swf_read_timeouts'
    autoload :UserAgent, 'aws-sdk-core/plugins/user_agent'

    module Protocols
      autoload :EC2, 'aws-sdk-core/plugins/protocols/ec2'
      autoload :JsonRpc, 'aws-sdk-core/plugins/protocols/json_rpc'
      autoload :Query, 'aws-sdk-core/plugins/protocols/query'
      autoload :RestJson, 'aws-sdk-core/plugins/protocols/rest_json'
      autoload :RestXml, 'aws-sdk-core/plugins/protocols/rest_xml'
    end

  end

  # @api private
  module Query
    autoload :EC2ParamBuilder, 'aws-sdk-core/query/ec2_param_builder'
    autoload :Handler, 'aws-sdk-core/query/handler'
    autoload :Param, 'aws-sdk-core/query/param'
    autoload :ParamBuilder, 'aws-sdk-core/query/param_builder'
    autoload :ParamList, 'aws-sdk-core/query/param_list'
  end

  # @api private
  module Rest
    autoload :Handler, 'aws-sdk-core/rest/handler'
    module Request
      autoload :Body, 'aws-sdk-core/rest/request/body'
      autoload :Builder, 'aws-sdk-core/rest/request/builder'
      autoload :Endpoint, 'aws-sdk-core/rest/request/endpoint'
      autoload :Headers, 'aws-sdk-core/rest/request/headers'
      autoload :QuerystringBuilder, 'aws-sdk-core/rest/request/querystring_builder'
    end
    module Response
      autoload :Body, 'aws-sdk-core/rest/response/body'
      autoload :Headers, 'aws-sdk-core/rest/response/headers'
      autoload :Parser, 'aws-sdk-core/rest/response/parser'
      autoload :StatusCode, 'aws-sdk-core/rest/response/status_code'
    end
  end

  # @api private
  module Signers
    autoload :Base, 'aws-sdk-core/signers/base'
    autoload :S3, 'aws-sdk-core/signers/s3'
    autoload :V2, 'aws-sdk-core/signers/v2'
    autoload :V3, 'aws-sdk-core/signers/v3'
    autoload :V4, 'aws-sdk-core/signers/v4'
  end

  # @api private
  module Stubbing
    autoload :EmptyStub, 'aws-sdk-core/stubbing/empty_stub'
    autoload :DataApplicator, 'aws-sdk-core/stubbing/data_applicator'
    autoload :StubData, 'aws-sdk-core/stubbing/stub_data'
    autoload :XmlError, 'aws-sdk-core/stubbing/xml_error'
    module Protocols
      autoload :EC2, 'aws-sdk-core/stubbing/protocols/ec2'
      autoload :Json, 'aws-sdk-core/stubbing/protocols/json'
      autoload :Query, 'aws-sdk-core/stubbing/protocols/query'
      autoload :Rest, 'aws-sdk-core/stubbing/protocols/rest'
      autoload :RestJson, 'aws-sdk-core/stubbing/protocols/rest_json'
      autoload :RestXml, 'aws-sdk-core/stubbing/protocols/rest_xml'
    end
  end

  module Waiters
    autoload :Poller, 'aws-sdk-core/waiters/poller'
    autoload :Errors, 'aws-sdk-core/waiters/errors'
    autoload :NullProvider, 'aws-sdk-core/waiters/null_provider'
    autoload :Provider, 'aws-sdk-core/waiters/provider'
    autoload :Waiter, 'aws-sdk-core/waiters/waiter'
  end

  # @api private
  module Xml
    autoload :Builder, 'aws-sdk-core/xml/builder'
    autoload :DefaultList,  'aws-sdk-core/xml/default_list'
    autoload :DefaultMap,  'aws-sdk-core/xml/default_map'
    autoload :DocBuilder, 'aws-sdk-core/xml/doc_builder'
    autoload :ErrorHandler,  'aws-sdk-core/xml/error_handler'
    autoload :Parser, 'aws-sdk-core/xml/parser'
  end

  class << self

    # @api private
    def shared_config
      enabled = ENV["AWS_SDK_CONFIG_OPT_OUT"] ? false : true
      @shared_config ||= SharedConfig.new(config_enabled: enabled)
    end

    # @return [Hash] Returns a hash of default configuration options shared
    #   by all constructed clients.
    attr_reader :config

    # @param [Hash] config
    def config=(config)
      if Hash === config
        @config = config
      else
        raise ArgumentError, 'configuration object must be a hash'
      end
    end

    # Return the partition with the given name. A partition describes
    # the services and regions available in that partition.
    #
    #     aws = Aws.partition('aws')
    #
    #     puts "Regions available in the aws partition:\n"
    #     aws.regions.each do |region|
    #       puts region.name
    #     end
    #
    #     puts "Services available in the aws partition:\n"
    #     aws.services.each do |services|
    #       puts services.name
    #     end
    #
    # See {Partitions} for more information and examples.
    #
    # @param [String] partition_name The name of the partition to return.
    #   Valid names include "aws", "aws-cn", and "aws-us-gov".
    #
    # @return [Partitions::Partition]
    #
    # @raise [ArgumentError] Raises an `ArgumentError` if a partition is
    #   not found with the given name. The error message contains a list
    #   of valid partition names.
    def partition(partition_name)
      Partitions.default_list.partition(partition_name)
    end

    # Return an array of partitions. A partition describes
    # the services and regions available in that partition.
    #
    #     Aws.partitions.each do |partition|
    #
    #       puts "Regions available in #{partition.name}:\n"
    #       partition.regions.each do |region|
    #         puts region.name
    #       end
    #
    #       puts "Services available in #{partition.name}:\n"
    #       partition.services.each do |service|
    #         puts service.name
    #       end
    #     end
    #
    # See {Partitions} for more information and examples.
    #
    # @return [Array<Partitions::Partition>] Returns an array of all
    #   known partitions.
    def partitions
      Partitions.default_list.partitions
    end

    # The SDK ships with a ca certificate bundle to use when verifying SSL
    # peer certificates. By default, this cert bundle is *NOT* used. The
    # SDK will rely on the default cert available to OpenSSL. This ensures
    # the cert provided by your OS is used.
    #
    # For cases where the default cert is unavailable, e.g. Windows, you
    # can call this method.
    #
    #     Aws.use_bundled_cert!
    #
    # @return [String] Returns the path to the bundled cert.
    def use_bundled_cert!
      config.delete(:ssl_ca_directory)
      config.delete(:ssl_ca_store)
      config[:ssl_ca_bundle] = File.expand_path(File.join(
        File.dirname(__FILE__),
        '..',
        'ca-bundle.crt'
      ))
    end

    # Close any long-lived connections maintained by the SDK's internal
    # connection pool.
    #
    # Applications that rely heavily on the `fork()` system call on POSIX systems
    # should call this method in the child process directly after fork to ensure
    # there are no race conditions between the parent process and its children
    # for the pooled TCP connections.
    #
    # Child processes that make multi-threaded calls to the SDK should block on
    # this call before beginning work.
    #
    # @return [nil]
    def empty_connection_pools!
      Seahorse::Client::NetHttp::ConnectionPool.pools.each do |pool|
        pool.empty!
      end
    end

    # Loads modules that are normally loaded with Ruby's `autoload`.
    # This can avoid thread-safety issues that some Ruby versions have
    # with `autoload`.
    #
    #     # loads ALL services
    #     Aws.eager_autoload!
    #
    # Loading all services can be slow. You can specify what services you
    # want to load with the `:services` option. All services not named
    # will continue to autoload as normal.
    #
    #     Aws.eager_autoload!(services: %w(S3 EC2))
    #
    # @return [void]
    def eager_autoload!(options = {})
      eager_loader = EagerLoader.new
      eager_loader.load(JMESPath)
      eager_loader.load(Seahorse)
      sub_modules(options).each do |module_or_class|
        eager_loader.load(module_or_class)
      end
      eager_loader
    end

    def sub_modules(options = {})
      constants = Aws.constants.map(&:to_s)
      if options[:services]
        constants -= SERVICE_MODULE_NAMES
        constants += options[:services] || SERVICE_MODULE_NAMES
      end
      constants.inject([]) do |modules, const_name|
        constant = Aws.const_get(const_name)
        modules << constant if Module === constant
        modules
      end
    end

    # Yields to the given block for each service that has already been
    # defined via {add_service}. Also yields to the given block for
    # each new service added after the callback is registered.
    # @api private
    def service_added(&block)
      callback = block if block_given?
      @services.each do |svc_name, (svc_module, options)|
        yield(svc_name, svc_module, options)
      end
      @service_added_callbacks << callback
    end

    # Registers a new service.
    #
    #     Aws.add_service('SvcName',
    #       api: '/path/to/svc.api.json',
    #       paginators: '/path/to/svc.paginators.json',
    #       waiters: '/path/to/svc.waiters.json',
    #       resources: '/path/to/svc.resources.json')
    #
    #     Aws::SvcName::Client.new
    #     #=> #<Aws::SvcName::Client>
    #
    # @param [String] svc_name The name of the service. This will also be
    #   the namespace under {Aws}. This must be a valid constant name.
    # @option options[String,Pathname,Hash,Seahorse::Model::Api,nil] :api
    # @option options[String,Pathname,Hash,nil] :paginators
    # @option options[String,Pathname,Hash,Waiters::Provider,nil] :waiters
    # @option options[String,Pathname,Hash,Resources::Definition,nil] :resources
    # @return [Module<Service>] Returns the new service module.
    def add_service(svc_name, options = {})
      svc_module = Module.new { extend Service }
      const_set(svc_name, svc_module)
      @services[svc_name] = [svc_module, options]
      @service_added_callbacks.each do |callback|
        callback.call(svc_name.to_s, *@services[svc_name])
      end
      svc_module
    end

  end

  # build service client classes
  service_added do |name, svc_module, options|
    options[:type_builder] ||= TypeBuilder.new(svc_module)
    svc_module.const_set(:Client, Client.define(name, options))
    svc_module.const_set(:Errors, Module.new { extend Errors::DynamicErrors })
  end

  # enable response paging
  service_added do |name, svc_module, options|
    if paginators = options[:paginators]
      paginators = Json.load_file(paginators) unless Hash === paginators
      paginators['pagination'].each do |n, rules|
        op_name = Seahorse::Util.underscore(n)
        operation = svc_module::Client.api.operation(op_name)
        operation[:pager] = Pager.new(rules)
      end
    end
  end

  # add shared client examples
  service_added do |name, svc_module, options|
    if ENV['DOCSTRINGS'] && options[:examples]
      json = Json.load_file(options[:examples])
      json['examples'].each_pair do |operation_name, examples|
        operation_name = Seahorse::Util.underscore(operation_name)
        operation = svc_module::Client.api.operation(operation_name)
        operation['examples'] = examples
      end
    end
  end

end
