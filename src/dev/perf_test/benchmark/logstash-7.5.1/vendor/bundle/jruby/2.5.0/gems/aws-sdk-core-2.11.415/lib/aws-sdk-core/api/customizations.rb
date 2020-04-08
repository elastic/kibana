module Aws
  module Api
    module Customizations

      @apis = {}
      @docs = {}
      @plugins = {}

      class << self

        def api(prefix, &block)
          @apis[prefix] = block
        end

        def doc(prefix, &block)
          @docs[prefix] = block
        end

        def plugins(prefix, options)
          @plugins[prefix] = {
            add: options[:add] || [],
            remove: options[:remove] || [],
          }
        end

        def apply_api_customizations(api)
          metadata = api['metadata'] || {}
          prefix = metadata['serviceFullName']
          # event stream is not supported at V2
          api = exclude_eventstream(api) if api['operations']
          @apis[prefix].call(api) if @apis[prefix]
        end

        def apply_doc_customizations(api, docs)
          prefix = api.metadata['serviceFullName']
          @docs[prefix].call(docs) if @docs[prefix]
        end

        def apply_plugins(client_class)
          prefix = client_class.api.metadata['serviceFullName']
          if @plugins[prefix]
            @plugins[prefix][:add].each { |p| client_class.add_plugin(p) }
            @plugins[prefix][:remove].each { |p| client_class.remove_plugin(p) }
          end
        end

        private

        def exclude_eventstream(api)
          api['operations'].each do |name, ref|
            inbound = ref['input'] && is_eventstream?(api, ref['input']['shape'])
            outbound = ref['output'] && is_eventstream?(api, ref['output']['shape'])
            api['operations'].delete(name) if !!inbound || !!outbound
          end
          api
        end

        def is_eventstream?(api, shape_name)
          shape = api['shapes'][shape_name]
          if shape['type'] == 'structure'
            eventstream = false
            shape['members'].each do |_, m_ref|
              eventstream ||= api['shapes'][m_ref['shape']]['eventstream']
            end
            eventstream
          else
            # non structure request/response shape
            # check if it's eventstream itself
            shape['eventstream']
          end
        end

      end

      plugins('Amazon API Gateway',
        add: %w(Aws::Plugins::APIGatewayHeader),
      )

      api('Amazon CloudFront') do |api|

        api['shapes'].each do |_, shape|
          if shape['members'] && shape['members']['MaxItems']
            shape['members']['MaxItems']['shape'] = 'integer'
          end
        end

        api['operations'].keys.each do |name|
          symbolized = name.sub(/\d{4}_\d{2}_\d{2}$/, '')
          api['operations'][symbolized] = api['operations'].delete(name)
        end

      end

      plugins('Amazon CloudSearch Domain',
        add: %w(Aws::Plugins::CSDConditionalSigning
          Aws::Plugins::CSDSwitchToPost),
        remove: %w(Aws::Plugins::RegionalEndpoint
          Aws::Plugins::EndpointPattern
          Aws::Plugins::EndpointDiscovery),
      )

      plugins('Amazon DynamoDB', add: %w(
        Aws::Plugins::DynamoDBExtendedRetries
        Aws::Plugins::DynamoDBSimpleAttributes
        Aws::Plugins::DynamoDBCRC32Validation
      ))

      api('Amazon Elastic Compute Cloud') do |api|
        if ENV['DOCSTRINGS']
          members = api['shapes']['CopySnapshotRequest']['members']
          members.delete('DestinationRegion')
          members.delete('PresignedUrl')
        end
      end

      plugins('Amazon Elastic Compute Cloud', add: %w(
        Aws::Plugins::EC2CopyEncryptedSnapshot
        Aws::Plugins::EC2RegionValidation
      ))

      api('Amazon Glacier') do |api|
        api['shapes']['Timestamp'] = {
          'type' => 'timestamp',
          'timestampFormat' => 'iso8601',
        }
        api['shapes'].each do |_, shape|
          if shape['members']
            shape['members'].each do |name, ref|
              case name
              when /date/i then ref['shape'] = 'Timestamp'
              when 'limit' then ref['shape'] = 'Size'
              when 'partSize' then ref['shape'] = 'Size'
              when 'archiveSize' then ref['shape'] = 'Size'
              end
            end
          end
        end
      end

      plugins('Amazon Glacier', add: %w(
        Aws::Plugins::GlacierAccountId
        Aws::Plugins::GlacierApiVersion
        Aws::Plugins::GlacierChecksums
      ))

      api('AWS Import/Export') do |api|
        api['operations'].each do |_, operation|
          operation['http']['requestUri'] = '/'
        end
      end

      api('AWS IoT Data Plane') do |api|
        api['metadata'].delete('endpointPrefix')
      end

      api('AWS Lambda') do |api|
        api['shapes']['Timestamp']['type'] = 'timestamp'
      end

      doc('AWS Lambda') do |docs|
        docs['shapes']['Blob']['refs']['UpdateFunctionCodeRequest$ZipFile'] =
          "<p>.zip file containing your packaged source code.</p>"
      end

      plugins('Amazon Machine Learning', add: %w(
        Aws::Plugins::MachineLearningPredictEndpoint
      ))

      api('Amazon Route 53') do |api|
        api['shapes']['PageMaxItems']['type'] = 'integer'
      end

      plugins('Amazon Route 53', add: %w(
        Aws::Plugins::Route53IdFix
      ))

      plugins('Amazon Relational Database Service', add: %w(
        Aws::Plugins::RDSCrossRegionCopying
      ))

      api('Amazon Relational Database Service') do |api|
        api['shapes']['CopyDBSnapshotMessage']['members']['DestinationRegion'] =
          {"shape" => "String"}
        api['shapes']['CreateDBInstanceReadReplicaMessage']['members']['DestinationRegion'] =
          {"shape" => "String"}
        api['shapes']['CopyDBClusterSnapshotMessage']['members']['DestinationRegion'] =
          {"shape" => "String"}
        api['shapes']['CreateDBClusterMessage']['members']['DestinationRegion'] =
          {"shape" => "String"}
        api['shapes']['CopyDBSnapshotMessage']['members']['SourceRegion'] =
          {"shape" => "String"}
        api['shapes']['CreateDBInstanceReadReplicaMessage']['members']['SourceRegion'] =
          {"shape" => "String"}
        api['shapes']['CopyDBClusterSnapshotMessage']['members']['SourceRegion'] =
          {"shape" => "String"}
        api['shapes']['CreateDBClusterMessage']['members']['SourceRegion'] =
          {"shape" => "String"}
      end

      doc('Amazon Relational Database Service') do |docs|
        docs['shapes']['String']['refs']['CopyDBSnapshotMessage$SourceRegion'] =
          "<p>The region which you are copying an encrypted snapshot from.</p>" +
          "<p>This is a required paramter that allows SDK to compute a pre-signed Url and" +
          " populate <code>PreSignedURL</code> parameter on your behalf.</p>"
        docs['shapes']['String']['refs']['CreateDBInstanceReadReplicaMessage$SourceRegion'] =
          "<p>The region which you are copying an encrypted snapshot from.</p>" +
          "<p>This is a required paramter that allows SDK to compute a pre-signed Url and" +
          " populate <code>PreSignedURL</code> parameter on your behalf.</p>"
        docs['shapes']['String']['refs']['CopyDBClusterSnapshotMessage$SourceRegion'] =
          "<p>The region which you are copying an encrypted snapshot from.</p>" +
          "<p>This is a required paramter that allows SDK to compute a pre-signed Url and" +
          " populate <code>PreSignedURL</code> parameter on your behalf.</p>"
        docs['shapes']['String']['refs']['CreateDBClusterMessage$SourceRegion'] =
          "<p>The region which you are copying an encrypted snapshot from.</p>" +
          "<p>This is a required paramter that allows SDK to compute a pre-signed Url and" +
          " populate <code>PreSignedURL</code> parameter on your behalf.</p>"
      end

      api('Amazon Simple Storage Service') do |api|
        api['metadata'].delete('signatureVersion')
        if ENV['DOCSTRINGS']
          api['shapes']['AccelerateBoolean'] = { 'type' => 'boolean' }
          api['operations'].each do |operation_name, operation|
            next if %w(CreateBucket ListBuckets DeleteBucket).include?(operation_name)
            if input_ref = operation['input']
              input_shape = api['shapes'][input_ref['shape']]
              input_shape['members']['UseAccelerateEndpoint'] = {
                'shape' => 'AccelerateBoolean'
              }
            end
          end
        end

        api['shapes']['ExpiresString'] = { 'type' => 'string' }
        %w(HeadObjectOutput GetObjectOutput).each do |shape|
          members = api['shapes'][shape]['members']
          # inject ExpiresString directly after Expires
          api['shapes'][shape]['members'] = members.inject({}) do |h, (k,v)|
            h[k] = v
            if k == 'Expires'
              h['ExpiresString'] = {
                'shape' => 'ExpiresString',
                'location' => 'header',
                'locationName' => 'Expires',
              }
            end
            h
          end
        end
      end

      doc('Amazon Simple Storage Service') do |docs|
        if ENV['DOCSTRINGS']
          docs['shapes']['AccelerateBoolean'] = {}
          docs['shapes']['AccelerateBoolean']['refs'] = {}
          docs['shapes']['AccelerateBoolean']['base'] = 'When <tt>true</tt>, the "https://BUCKETNAME.s3-accelerate.amazonaws.com" endpoint will be used.'
        end
      end

      plugins('Amazon Simple Storage Service', add: %w(
        Aws::Plugins::S3Accelerate
        Aws::Plugins::S3Dualstack
        Aws::Plugins::S3BucketDns
        Aws::Plugins::S3BucketNameRestrictions
        Aws::Plugins::S3Expect100Continue
        Aws::Plugins::S3HostId
        Aws::Plugins::S3Http200Errors
        Aws::Plugins::S3GetBucketLocationFix
        Aws::Plugins::S3LocationConstraint
        Aws::Plugins::S3Md5s
        Aws::Plugins::S3Redirects
        Aws::Plugins::S3SseCpk
        Aws::Plugins::S3UrlEncodedKeys
        Aws::Plugins::S3RequestSigner
      ))

      plugins('AWS Security Token Service', add: %w(
        Aws::Plugins::STSRegionalEndpoints
      ))

      plugins('AWS S3 Control', add: %w(
        Aws::Plugins::S3HostId
        Aws::Plugins::S3ControlDns
        Aws::Plugins::S3ControlDualstack
        Aws::Plugins::S3ControlSigner
      ))

      api('Amazon Simple Queue Service') do |api|
        api['metadata']['errorPrefix'] = 'AWS.SimpleQueueService.'
      end

      plugins('Amazon Simple Queue Service', add: %w(
        Aws::Plugins::SQSQueueUrls
        Aws::Plugins::SQSMd5s
      ))

      plugins('Amazon Simple Workflow Service', add: %w(
        Aws::Plugins::SWFReadTimeouts
      ))

    end
  end
end
