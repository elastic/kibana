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

require 'aws/core'
require 'aws/data_pipeline/config'

module AWS

  # This class is the starting point for working with AWS Data Pipeline.
  #
  # To use AWS Data Pipeline you must first
  # [sign up here](http://aws.amazon.com/datapipeline/).
  #
  # For more information about AWS Data Pipeline:
  #
  # * [AWS Data Pipeline](http://aws.amazon.com/datapipeline/)
  # * [AWS Data Pipeline Documentation](http://aws.amazon.com/documentation/datapipeline/)
  #
  # # Credentials
  #
  # You can setup default credentials for all AWS services via
  # AWS.config:
  #
  #     AWS.config(
  #       :access_key_id => 'YOUR_ACCESS_KEY_ID',
  #       :secret_access_key => 'YOUR_SECRET_ACCESS_KEY')
  #
  # Or you can set them directly on the AWS::DataPipeline interface:
  #
  #     datapipeline = AWS::DataPipeline.new(
  #       :access_key_id => 'YOUR_ACCESS_KEY_ID',
  #       :secret_access_key => 'YOUR_SECRET_ACCESS_KEY')
  #
  # # Using the Client
  #
  # AWS::DataPipeline does not provide higher level abstractions for AWS Data Pipeline
  # this time.  You can still access all of the API methods using
  # {AWS::DataPipeline::Client}.  Here is how you access the client and make
  # a simple request:
  #
  #     data_pipeline = AWS::DataPipeline.new
  #
  #     resp = data_pipeline.client.describe_pipelines
  #     resp[:pipeline_description_list].each do |pipeline|
  #       puts pipeline[:pipeline_id]
  #     end
  #
  # See {Client} for documentation on all of the supported operations.
  #
  # @!attribute [r] client
  #   @return [Client] the low-level DataPipeline client object
  class DataPipeline

    autoload :Client, 'aws/data_pipeline/client'
    autoload :Errors, 'aws/data_pipeline/errors'

    include Core::ServiceInterface

    endpoint_prefix 'datapipeline'

  end
end
