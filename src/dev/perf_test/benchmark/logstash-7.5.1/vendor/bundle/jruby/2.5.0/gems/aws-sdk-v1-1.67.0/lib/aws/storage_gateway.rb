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
require 'aws/storage_gateway/config'

module AWS

  # This class is the starting point for working with AWS Storage Gateway.
  #
  # To use AWS Storage Gateway you must first
  # [sign up here](http://aws.amazon.com/storagegateway/).
  #
  # For more information about AWS Storage Gateway:
  #
  # * [AWS Storage Gateway](http://aws.amazon.com/storagegateway/)
  # * [AWS Storage Gateway Documentation](http://aws.amazon.com/documentation/storagegateway/)
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
  # Or you can set them directly on the AWS::StorageGateway interface:
  #
  #     sg = AWS::StorageGateway.new(
  #       :access_key_id => 'YOUR_ACCESS_KEY_ID',
  #       :secret_access_key => 'YOUR_SECRET_ACCESS_KEY')
  #
  # # Using the Client
  #
  # AWS::StorageGateway does not provide higher level abstractions for Route 53 at
  # this time.  You can still access all of the API methods using
  # {AWS::StorageGateway::Client}.  Here is how you access the client and make
  # a simple request:
  #
  #     sg = AWS::StorageGateway.new
  #
  #     resp = sg.client.list_gateways
  #     resp[:gateways].each do |gateway|
  #       puts gateway[:gateway_arn]
  #     end
  #
  # See {Client} for documentation on all of the supported operations.
  #
  # @!attribute [r] client
  #   @return [Client] the low-level StorageGateway client object
  class StorageGateway

    autoload :Client, 'aws/storage_gateway/client'
    autoload :Errors, 'aws/storage_gateway/errors'

    include Core::ServiceInterface

    endpoint_prefix 'storagegateway'

  end
end
