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
require 'aws/cloud_front/config'

module AWS

  # This class is the starting point for working with Amazon CloudFront.
  #
  # To use Amazon CloudFront you must first
  # [sign up here](http://aws.amazon.com/cloudfront/).
  #
  # For more information about Amazon CloudFront:
  #
  # * [Amazon CloudFront](http://aws.amazon.com/cloudfront/)
  # * [Amazon CloudFront Documentation](http://aws.amazon.com/documentation/cloudfront/)
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
  # Or you can set them directly on the AWS::Route53 interface:
  #
  #     cf = AWS::CloudFront.new(
  #       :access_key_id => 'YOUR_ACCESS_KEY_ID',
  #       :secret_access_key => 'YOUR_SECRET_ACCESS_KEY')
  #
  # # Using the Client
  #
  # AWS::CloudFront does not provide higher level abstractions for CloudFront at
  # this time.  You can still access all of the API methods using
  # {AWS::CloudFront::Client}.  Here is how you access the client and make
  # a simple request:
  #
  #       cf = AWS::CloudFront.new
  #
  #     resp = cf.client.list_distributions
  #     resp[:items].each do |distribution|
  #       # ...
  #     end
  #
  # See {Client} for documentation on all of the supported operations.
  #
  # @!attribute [r] client
  #   @return [Client] the low-level CloudFront client object
  class CloudFront

    autoload :Client,  'aws/cloud_front/client'
    autoload :Errors,  'aws/cloud_front/errors'

    include Core::ServiceInterface

    endpoint_prefix 'cloudfront', :global => true

  end
end
