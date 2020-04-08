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
    class LaunchConfigurationCollection

      include Core::Collection::WithLimitAndNextToken

      # Creates an Auto Scaling launch configuration.
      #
      #     auto_scaling.launch_configurations.create('name', 'ami-12345', 'm1.small')
      #
      # @param [String] name The name of the launch configuration to create.
      #
      # @param [EC2::Image,String] image An {EC2::Image} or image id string.
      #
      # @param [String] instance_type The type of instance (e.g.
      #   't1.micro', 'm1.small', 'm2.4xlarge', etc).
      #
      # @param [Hash] options
      #
      # @option options [Array<Hash>] :block_device_mappings
      #
      # @option options [Boolean] :detailed_instance_monitoring (true)
      #   When enabled, CloudWatch will generate metrics every minute
      #   and your account will be charged a fee. When you disable
      #   detailed monitoring, by specifying False, Cloudwatch will
      #   generate metrics every 5 minutes.
      #
      # @option options [String] :kernel_id The ID of the kernel to
      #   launch the instances with.
      #
      # @option options [KeyPair,String] :key_pair The keypair to launch
      #   instances with.  This may be an {EC2::KeyPair} object or
      #   or key pair name string.
      #
      # @option options [String] :ramdisk_id The ID of the ramdisk to
      #   launch the instances with.
      #
      # @option options [Array<EC2::SecurityGroup>,Array<String>] :security_groups
      #   A list of security groups to associate with the instances.
      #   For both EC2 Classic and VPC, this option can be an array of {EC2::SecurityGroup} objects
      #   or security group ids. For EC2 Classic, this option can also be an array of
      #   security group names.
      #   Note: The VPC is derived from the security groups.
      #
      # @option options [String] :user_data The user data available to
      #   the launched Amazon EC2 instances.
      #
      # @option options [String] :iam_instance_profile
      #
      # @option options [String] :spot_price
      #
      # @option options [Boolean] :associate_public_ip_address
      #   Used for Auto Scaling groups that launch instances into an
      #   Amazon Virtual Private Cloud (Amazon VPC). Specifies whether
      #   to assign a public IP address to each instance launched in a Amazon VPC.
      #
      # @option options [String] :placement_tenancy
      #
      # @option options [String] :classic_link_vpc_id
      #   The ID of a ClassicLink-enabled VPC to link EC2 Classic instances to.
      #
      # @option options [Array<EC2::SecurityGroup>,Array<String>] :classic_link_vpc_security_groups
      #   The list of security groups for the specified VPC to associate
      #   with the instances. This may be an array of {EC2::SecurityGroup}
      #   objects or security group ids. VPC security groups cannot be
      #   referenced by name.
      #
      # @return [LaunchConfiguration]
      #
      def create name, image, instance_type, options = {}

        client_opts = {}
        client_opts[:launch_configuration_name] = name
        client_opts[:image_id] = image_id_opt(image)
        client_opts[:instance_type] = instance_type
        client_opts[:instance_monitoring] = instance_monitoring_opt(options) if
          options.key?(:detailed_instance_monitoring)
        client_opts[:key_name] = key_name_opt(options) if options[:key_pair]
        client_opts[:security_groups] = security_groups_opt(options[:security_groups]) if
          options.key?(:security_groups)
        client_opts[:classic_link_vpc_security_groups] = security_groups_opt(options[:classic_link_vpc_security_groups]) if
          options.key?(:classic_link_vpc_security_groups)
        client_opts[:user_data] = user_data_opt(options) if options[:user_data]

        [
          :classic_link_vpc_id,
          :iam_instance_profile,
          :spot_price,
          :kernel_id,
          :ramdisk_id,
          :block_device_mappings,
          :associate_public_ip_address,
          :placement_tenancy,
        ].each do |opt|
          client_opts[opt] = options[opt] if options.key?(opt)
        end

        client.create_launch_configuration(client_opts)

        LaunchConfiguration.new(name,
          :image_id => client_opts[:image_id],
          :instance_type => client_opts[:instance_type],
          :config => config)

      end

      # @param [String] name The name of a launch configuration.
      # @return [LaunchConfiguration]
      def [] name
        LaunchConfiguration.new(name, :config => config)
      end

      protected

      def _each_item next_token, limit, options = {}, &block

        options[:next_token] = next_token if next_token
        options[:max_records] = limit if limit

        resp = client.describe_launch_configurations(options)
        resp.launch_configurations.each do |details|

          launch_configuration = LaunchConfiguration.new_from(
            :describe_launch_configurations,
            details,
            details.launch_configuration_name,
            :config => config)

          yield(launch_configuration)

        end
        resp.data[:next_token]
      end

      def image_id_opt image
        image.is_a?(EC2::Image) ? image.image_id : image
      end

      def instance_monitoring_opt options
        options[:detailed_instance_monitoring] == true ?
          { :enabled => true } :
          { :enabled => false }
      end

      def key_name_opt options
        key_pair = options[:key_pair]
        key_pair.is_a?(EC2::KeyPair) ? key_pair.name : key_pair
      end

      def security_groups_opt security_groups
        security_groups.collect do |sg|
          sg.is_a?(EC2::SecurityGroup) ? sg.id : sg
        end
      end

      def user_data_opt options
        Base64.encode64(options[:user_data])
      end

    end
  end
end
