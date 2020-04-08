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
require 'aws/direct_connect/config'

module AWS

  # This class is the starting point for working with AWS Import/Export.
  #
  # To use AWS Direct Connect you must first
  # [sign up here](http://aws.amazon.com/directconnect/).
  #
  # For more information about AWS AWS Direct Connect:
  #
  # * [AWS Direct Connect](http://aws.amazon.com/directconnect/)
  # * [AWS Direct Connect Documentation](http://aws.amazon.com/documentation/directconnect/)
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
  # Or you can set them directly on the AWS::DirectConnect interface:
  #
  #     dc = AWS::DirectConnect.new(
  #       :access_key_id => 'YOUR_ACCESS_KEY_ID',
  #       :secret_access_key => 'YOUR_SECRET_ACCESS_KEY')
  #
  # # Using the Client
  #
  # AWS::DirectConnect does not provide higher level abstractions for at
  # this time.  You can still access all of the API methods using
  # {AWS::DirectConnect::Client}.  Here is how you access the client and make
  # a simple request:
  #
  #     dc = AWS::DirectConnect.new
  #
  #     resp = dc.client.describe_connections
  #     resp[:connections].each do |connection|
  #       # ...
  #     end
  #
  # See {Client} for documentation on all of the supported operations.
  #
  # @!attribute [r] client
  #   @return [Client] the low-level DirectConnect client object
  #
  class DirectConnect

    autoload :Client, 'aws/direct_connect/client'
    autoload :Errors, 'aws/direct_connect/errors'

    include Core::ServiceInterface

    endpoint_prefix 'directconnect'

  end
end
