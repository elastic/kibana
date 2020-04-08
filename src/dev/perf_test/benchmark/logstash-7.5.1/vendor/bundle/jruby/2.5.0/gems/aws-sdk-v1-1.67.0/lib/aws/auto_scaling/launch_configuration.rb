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

require 'base64'

module AWS
  class AutoScaling

    # @attr_reader [String] name
    #
    # @attr_reader [Time] created_time
    #
    # @attr_reader [String] image_id
    #
    # @attr_reader [Boolean] detailed_instance_monitoring
    #
    # @attr_reader [String] instance_type
    #
    # @attr_reader [String,nil] kernel_id
    #
    # @attr_reader [String,nil] key_name
    #
    # @attr_reader [String] arn
    #
    # @attr_reader [String,nil] ramdisk_id
    #
    # @attr_reader [String,nil] user_data
    #
    # @attr_reader [Array<Hash>] block_device_mappings
    #
    # @attr_reader [String] iam_instance_profile
    #
    # @attr_reader [String] spot_price
    #
    # @attr_reader [Boolean] associate_public_ip_address
    #
    # @attr_reader [String] classic_link_vpc_id
    class LaunchConfiguration < Core::Resource

      # @api private
      def initialize name, options = {}
        super(options.merge(:name => name))
      end

      attribute :name, :from => :launch_configuration_name, :static => true

      attribute :created_time, :static => true

      alias_method :created_at, :created_time

      attribute :image_id, :static => true

      attribute :detailed_instance_monitoring,
        :from => :instance_monitoring,
        :static => true do
        translates_output {|value| value[:enabled] }
      end

      alias_method :detailed_instance_monitoring?, :detailed_instance_monitoring

      attribute :instance_type, :static => true

      attribute :kernel_id, :static => true

      attribute :key_name, :static => true

      attribute :arn, :from => :launch_configuration_arn, :static => true

      attribute :ramdisk_id, :static => true

      attribute :iam_instance_profile, :static => true

      attribute :spot_price, :static => true

      attribute :user_data, :static => true do
        translates_output{|v| Base64.decode64(v) }
      end

      attribute :block_device_mappings,
        :static => true do
        translates_output{|mappings| mappings.map(&:to_hash) }
      end

      attribute :security_group_details,
        :from => :security_groups,
        :static => true

      protected :security_group_details

      attribute :classic_link_vpc_security_group_details,
                :from => :classic_link_vpc_security_groups,
                :static => true

      protected :classic_link_vpc_security_group_details

      attribute :classic_link_vpc_id, :static => true

      attribute :associate_public_ip_address, :static => true

      populates_from(:describe_launch_configurations) do |resp|
        resp.launch_configurations.find do |lc|
          lc.launch_configuration_name == name
        end
      end

      # @return [EC2::Image]
      def image
        EC2::Image.new(image_id, :config => config)
      end

      # @return [KeyPair,nil]
      def key_pair
        if key_name
          EC2::KeyPair.new(key_name, :config => config)
        end
      end

      # @return [Array<EC2::SecurityGroup>]
      def security_groups
        get_security_groups(security_group_details)
      end

      # @return [Array<EC2::SecurityGroup>]
      def classic_link_vpc_security_groups
        get_security_groups(classic_link_vpc_security_group_details)
      end

      # @return [Boolean] Returns true if this launch configuration exists.
      def exists?
        !!get_resource.launch_configurations.first
      end

      # Deletes the current launch configuration.
      # @return [nil]
      def delete
        client.delete_launch_configuration(resource_options)
        nil
      end

      protected

      def get_security_groups(names_or_ids)
        if names_or_ids.all?{|str| str.match(/^sg-[0-9a-f]{8}$/) }
          names_or_ids.collect do |security_group_id|
            EC2::SecurityGroup.new(security_group_id, :config => config)
          end
        else
          begin
            ec2 = EC2.new(:config => config)
            ec2.security_groups.filter('group-name', *names_or_ids).to_a
          rescue
            names_or_ids
          end
        end
      end

      def resource_identifiers
        [[:launch_configuration_name, name]]
      end

      def get_resource attr_name = nil
        client_opts = {}
        client_opts[:launch_configuration_names] = [name]
        client.describe_launch_configurations(client_opts)
      end

    end
  end
end
