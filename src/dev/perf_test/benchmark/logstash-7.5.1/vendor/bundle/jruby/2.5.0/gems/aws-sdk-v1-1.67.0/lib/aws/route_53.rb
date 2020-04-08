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
require 'aws/route_53/config'

module AWS

  # This class is the starting point for working with Amazon Route 53.
  #
  # To use Amazon Route 53 you must first
  # [sign up here](http://aws.amazon.com/route53/).
  #
  # For more information about Amazon Route 53:
  #
  # * [Amazon Route 53](http://aws.amazon.com/route53/)
  # * [Amazon Route 53 Documentation](http://aws.amazon.com/documentation/route53/)
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
  #     r53 = AWS::Route53.new(
  #       :access_key_id => 'YOUR_ACCESS_KEY_ID',
  #       :secret_access_key => 'YOUR_SECRET_ACCESS_KEY')
  #
  # # Using the Client
  #
  # AWS::Route53 does not provide higher level abstractions for Route 53 at
  # this time.  You can still access all of the API methods using
  # {AWS::Route53::Client}.  Here is how you access the client and make
  # a simple request:
  #
  #       r53 = AWS::Route53.new
  #
  #     resp = r53.client.list_hosted_zones
  #     resp[:hosted_zones].each do |zone|
  #       # ...
  #     end
  #
  # See {Client} for documentation on all of the supported operations.
  #
  # @!attribute [r] client
  #   @return [Client] the low-level Route53 client object
  class Route53

    autoload :ChangeRequest, 'aws/route_53/change_batch'
    autoload :ChangeBatch, 'aws/route_53/change_batch'
    autoload :ChangeInfo, 'aws/route_53/change_info'
    autoload :Client, 'aws/route_53/client'
    autoload :CreateRequest, 'aws/route_53/change_batch'
    autoload :DeleteRequest, 'aws/route_53/change_batch'
    autoload :Errors, 'aws/route_53/errors'
    autoload :HostedZone, 'aws/route_53/hosted_zone'
    autoload :HostedZoneCollection, 'aws/route_53/hosted_zone_collection'
    autoload :ResourceRecordSet, 'aws/route_53/resource_record_set'
    autoload :ResourceRecordSetCollection, 'aws/route_53/resource_record_set_collection'

    include Core::ServiceInterface

    endpoint_prefix 'route53', :global => true

    # @return [HostedZoneCollection]
    def hosted_zones
      HostedZoneCollection.new(:config => config)
    end

  end
end
