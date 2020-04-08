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

    # Represents an AWS region.  A region has a name and provides access
    # to service interface objects.
    #
    #   aws = AWS.regions['us-west-1']
    #
    #   aws.dynamo_db.tables.map(&:name)
    #   aws.ec2.instances.map(&:id)
    #
    # Regions provide helper methods for each service.
    #
    # @attr_reader [AutoScaling] auto_scaling
    # @attr_reader [CloudFormation] cloud_formation
    # @attr_reader [CloudFront] cloud_front
    # @attr_reader [CloudSearch] cloud_search
    # @attr_reader [CloudTrail] cloud_trail
    # @attr_reader [CloudWatch] cloud_watch
    # @attr_reader [DataPipeline] data_pipeline
    # @attr_reader [DirectConnect] direct_connect
    # @attr_reader [DynamoDB] dynamo_db
    # @attr_reader [EC2] ec2
    # @attr_reader [ElasticBeanstalk] elastic_beanstalk
    # @attr_reader [ElasticTranscoder] elastic_transcoder
    # @attr_reader [ElastiCache] elasticache
    # @attr_reader [ELB] elb
    # @attr_reader [EMR] emr
    # @attr_reader [Glacier] glacier
    # @attr_reader [IAM] iam
    # @attr_reader [ImportExport] import_export
    # @attr_reader [Kinesis] kinesis
    # @attr_reader [OpsWorks] ops_works
    # @attr_reader [RDS] rds
    # @attr_reader [Redshift] redshift
    # @attr_reader [Route53] route_53
    # @attr_reader [S3] s3
    # @attr_reader [SimpleEmailService] ses
    # @attr_reader [SimpleDB] simple_db
    # @attr_reader [SNS] sns
    # @attr_reader [SQS] sqs
    # @attr_reader [StorageGateway] storage_gateway
    # @attr_reader [STS] sts
    # @attr_reader [Support] support
    # @attr_reader [SimpleWorkflow] swf
    #
    class Region

      # @param [String] name
      # @option options [Configuration] :config (AWS.config)
      def initialize name, options = {}
        @name = name
        @config = options[:config] || AWS.config
        @config = @config.with(:region => name)
      end

      # @return [String] The name of this region (e.g. 'us-west-1').
      attr_reader :name

      # @return [Configuration]
      attr_reader :config

      AWS::SERVICES.values.each do |svc|
        define_method(svc.method_name) do
          AWS.const_get(svc.class_name).new(:config => config)
        end
        alias_method(svc.method_alias, svc.method_name) if svc.method_alias
      end

    end
  end
end
