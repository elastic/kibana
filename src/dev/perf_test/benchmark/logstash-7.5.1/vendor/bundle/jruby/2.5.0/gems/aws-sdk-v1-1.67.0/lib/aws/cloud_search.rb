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
require 'aws/cloud_search/config'

module AWS

  # This class is the starting point for working with Amazon CloudSearch.
  #
  # To use Amazon CloudSearch you must first
  # [sign up here](http://aws.amazon.com/cloudsearch/).
  #
  # For more information about Amazon CloudSearch:
  #
  # * [Amazon CloudSearch](http://aws.amazon.com/cloudsearch/)
  # * [Amazon CloudSearch Documentation](http://aws.amazon.com/documentation/cloudsearch/)
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
  # Or you can set them directly on the AWS::CloudSearch interface:
  #
  #     cs = AWS::CloudSearch.new(
  #       :access_key_id => 'YOUR_ACCESS_KEY_ID',
  #       :secret_access_key => 'YOUR_SECRET_ACCESS_KEY')
  #
  # # Using the Client
  #
  # AWS::CloudSearch does not provide higher level abstractions for CloudSearch at
  # this time.  You can still access all of the API methods using
  # {AWS::CloudSearch::Client}.  Here is how you access the client and make
  # a simple request:
  #
  #     cs = AWS::CloudSearch.new
  #
  #     resp = cs.client.describe_domains
  #     resp[:domain_status_list].each do |domain|
  #       puts domain[:domain_id]
  #     end
  #
  # See {Client} for documentation on all of the supported operations.
  #
  # @!attribute [r] client
  #   @return [Client] the low-level CloudSearch client object
  class CloudSearch

    autoload :Client, 'aws/cloud_search/client'
    autoload :Errors, 'aws/cloud_search/errors'

    include Core::ServiceInterface

    endpoint_prefix 'cloudsearch'

  end

end
