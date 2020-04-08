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
  class RDS

    # @attr_reader [String] db_instance_class
    #
    # @attr_reader [String] engine
    #
    # @attr_reader [String] db_instance_status
    #
    # @attr_reader [String] master_username
    #
    # @attr_reader [String] db_name
    #
    # @attr_reader [String] endpoint_address
    #
    # @attr_reader [Integer] endpoint_port
    #
    # @attr_reader [Integer] allocated_storage
    #
    # @attr_reader [Time] creation_date_time
    #
    # @attr_reader [String] preferred_backup_window
    #
    # @attr_reader [Integer] backup_retention_period
    #
    # @attr_reader [String] availability_zone_name
    #
    # @attr_reader [String] preferred_maintenance_window
    #
    # @attr_reader [Time] latest_restorable_time
    #
    # @attr_reader [Boolean] multi_az
    #
    # @attr_reader [Integer] iops
    #
    # @attr_reader [String] engine_version
    #
    # @attr_reader [Boolean] auto_minor_version_upgrade
    #
    # @attr_reader [String] read_replica_source_db_instance_identifier
    #
    # @attr_reader [Array<String>] read_replica_db_instance_identifiers
    #
    # @attr_reader [String] license_model
    #
    # @attr_reader [String] character_set_name
    #
    # @attr_reader [String,nil] vpc_id
    #
    class DBInstance < Core::Resource

      # @param [String] db_instance_id
      # @param [Hash] options
      def initialize db_instance_id, options = {}
        @db_instance_identifier = db_instance_id
        super
      end

      # @return [String]
      attr_reader :db_instance_identifier

      alias_method :id, :db_instance_identifier

      alias_method :db_instance_id, :db_instance_identifier

      attribute :vpc_id, :from => [:db_subnet_group, :vpc_id], :static => true

      attribute :allocated_storage, :static => true, :alias => :size

      attribute :auto_minor_version_upgrade

      attribute :availability_zone_name,
        :from => :availability_zone,
        :static => true

      attribute :backup_retention_period, :static => true

      attribute :character_set_name, :static => true

      attribute :creation_date_time,
        :from => :instance_create_time,
        :static => true,
        :alias => :created_at

      attribute :db_instance_class, :static => true

      attribute :db_instance_status, :alias => :status

      attribute :db_name, :static => true, :alias => :name

      attribute :endpoint_address,
        :from => [:endpoint, :address],
        :static => true

      attribute :endpoint_port,
        :from => [:endpoint, :port],
        :static => true

      attribute :engine, :static => true

      attribute :engine_version, :static => true

      attribute :latest_restorable_time

      attribute :license_model

      attribute :master_username, :static => true

      attribute :multi_az, :static => true, :alias => :multi_az?

      attribute :iops, :static => true

      attribute :preferred_backup_window, :static => true

      attribute :preferred_maintenance_window, :static => true

      attribute :read_replica_db_instance_identifiers, :static => true

      attribute :read_replica_source_db_instance_identifier, :static => true

      populates_from(:create_db_instance) do |resp|
        resp.data if resp.data[:db_instance_identifier] == id
      end

      populates_from(:describe_db_instances) do |resp|
        resp.data[:db_instances].find{|j| j[:db_instance_identifier] == id }
      end

      # @return [EC2::VPC,nil]
      def vpc
        if vpc_id
          EC2::VPC.new(vpc_id, :config => config)
        end
      end

      # Modifies the database instance.
      # @note You do not need to set `:db_instance_identifier`.
      # @see Client#modify_db_instance
      # @param (see Client#modify_db_instance)
      def modify options = {}
        client.modify_db_instance(options.merge(:db_instance_identifier => id))
      end

      # @return [DBSnapshotCollection]
      def snapshots
        DBSnapshotCollection.new(:config => config).db_instance(self)
      end

      # @return [DBSnapshot]
      def create_snapshot db_snapshot_id

        options = {}
        options[:db_snapshot_identifier] = db_snapshot_id
        options[:db_instance_identifier] = db_instance_identifier
        resp = client.create_db_snapshot(options)

        DBSnapshot.new_from(:create_db_snapshot, resp,
          resp[:db_snapshot_identifier], :config => config)

      end

      # Reboots this databse instance.
      # @param [Hash] options
      # @option options [Boolean] :force_failover When `true`, the reboot will be
      #   conducted through a MultiAZ failover. Constraint: You cannot
      #   specify `true` if the instance is not configured for MultiAZ.
      # @return [nil]
      def reboot options = {}
        client.reboot_db_instance(options.merge(:db_instance_identifier => id))
        nil
      end

      # Terminates (deletes) this database instance.
      # @return [nil]
      def delete options = {}
        client.delete_db_instance(options.merge(:db_instance_identifier => id))
        nil
      end

      # @return [Boolean] Returns `true` if the db instance exists.
      def exists?
        fail AWS::RDS::Errors::DBInstanceNotFound if id.to_s.empty?
        get_resource
        true
      rescue AWS::RDS::Errors::DBInstanceNotFound
        false
      end

      protected

      def resource_identifiers
        [[:db_instance_identifier, id]]
      end

      def get_resource attr = nil
        client.describe_db_instances(:db_instance_identifier => id)
      end

    end
  end
end
