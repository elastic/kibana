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
require 'aws/import_export/config'

module AWS

  # This class is the starting point for working with AWS Import/Export.
  #
  # To use AWS Import/Export you must first
  # [sign up here](http://aws.amazon.com/importexport/).
  #
  # For more information about AWS Import/Export:
  #
  # * [AWS Import/Export](http://aws.amazon.com/importexport/)
  # * [AWS Import/Export Documentation](http://aws.amazon.com/documentation/importexport/)
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
  # Or you can set them directly on the AWS::ImportExport interface:
  #
  #     ie = AWS::ImportExport.new(
  #       :access_key_id => 'YOUR_ACCESS_KEY_ID',
  #       :secret_access_key => 'YOUR_SECRET_ACCESS_KEY')
  #
  # # Using the Client
  #
  # AWS::ImportExport does not provide higher level abstractions for Import/Export at
  # this time.  You can still access all of the API methods using
  # {AWS::ImportExport::Client}.  Here is how you access the client and make
  # a simple request:
  #
  #
  #     ie = AWS::ImportExport.new
  #
  #     resp = ie.client.list_hosted_zones
  #     resp[:hosted_zones].each do |zone|
  #       # ...
  #     end
  #
  # See {Client} for documentation on all of the supported operations.
  #
  # @!attribute [r] client
  #   @return [Client] the low-level ImportExport client object
  class ImportExport

    autoload :Client, 'aws/import_export/client'
    autoload :Errors, 'aws/import_export/errors'

    include Core::ServiceInterface

    endpoint_prefix 'importexport', :global => true

  end
end
