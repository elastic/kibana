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
require 'aws/rds/config'

module AWS

  # This class is the starting point for working with Amazon Relational
  # Database Service (RDS).
  #
  # For more information about RDS:
  #
  # * [Amazon RDS](http://aws.amazon.com/rds/)
  # * [Amazon RDS Documentation](http://aws.amazon.com/documentation/rds/)
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
  # Or you can set them directly on the AWS::RDS interface:
  #
  #     rds = AWS::RDS.new(
  #       :access_key_id => 'YOUR_ACCESS_KEY_ID',
  #       :secret_access_key => 'YOUR_SECRET_ACCESS_KEY')
  #
  # @!attribute [r] client
  #   @return [Client] the low-level RDS client object
  class RDS

    autoload :Client, 'aws/rds/client'
    autoload :Errors, 'aws/rds/errors'
    autoload :DBInstance, 'aws/rds/db_instance'
    autoload :DBInstanceCollection, 'aws/rds/db_instance_collection'
    autoload :DBSnapshot, 'aws/rds/db_snapshot'
    autoload :DBSnapshotCollection, 'aws/rds/db_snapshot_collection'

    include Core::ServiceInterface

    endpoint_prefix 'rds'

    # @return [DBInstanceCollection]
    def db_instances
      DBInstanceCollection.new(:config => config)
    end
    alias_method :instances, :db_instances

    # @return [DBSnapshotCollection]]
    def db_snapshots
      DBSnapshotCollection.new(:config => config)
    end
    alias_method :snapshots, :db_snapshots

  end
end
