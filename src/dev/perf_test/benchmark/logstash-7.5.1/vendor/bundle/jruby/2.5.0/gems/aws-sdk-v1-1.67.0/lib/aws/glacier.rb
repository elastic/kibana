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
require 'aws/glacier/config'

module AWS

  # This class is the starting point for working with Amazon Glacier.
  #
  # To use Amazon Glacier you must first
  # [sign up here](http://aws.amazon.com/glacier/).
  #
  # For more information about Amazon Glacier:
  #
  # * [Amazon Glacier](http://aws.amazon.com/glacier/)
  # * [Amazon Glacier Documentation](http://aws.amazon.com/documentation/glacier/)
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
  # Or you can set them directly on the AWS::Glacier interface:
  #
  #     glacier = AWS::Glacier.new(
  #       :access_key_id => 'YOUR_ACCESS_KEY_ID',
  #       :secret_access_key => 'YOUR_SECRET_ACCESS_KEY')
  #
  # See {Client} for documentation on all of the supported API operations.
  #
  # @!attribute [r] client
  #   @return [Client] the low-level Glacier client object
  class Glacier

    autoload :Archive, 'aws/glacier/archive'
    autoload :ArchiveCollection, 'aws/glacier/archive_collection'
    autoload :Client, 'aws/glacier/client'
    autoload :Errors, 'aws/glacier/errors'
    autoload :Resource, 'aws/glacier/resource'
    autoload :Vault, 'aws/glacier/vault'
    autoload :VaultCollection, 'aws/glacier/vault_collection'
    autoload :VaultNotificationConfiguration, 'aws/glacier/vault_notification_configuration'

    include Core::ServiceInterface

    endpoint_prefix 'glacier'

    # @option options[String] :account_id ('-')
    def initialize options = {}
      @account_id = options[:account_id] || '-'
      super
    end

    # @return [String]
    attr_accessor :account_id

    # @return [VaultCollection] Returns a collection for working with
    #   vaults that belong to this account.
    def vaults
      VaultCollection.new(:config => config, :account_id => account_id)
    end

  end
end
