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
  class AutoScaling

    # This mixin provides a method for parsing Auto Scaling group options
    # (for create and update methods).
    # @api private
    module GroupOptions

      protected

      # @param [Hash] options
      #
      # @option options [required,Integer] :min_size
      #   The maximum size of the Auto Scaling group.
      #
      # @option options [required,Integer] :max_size
      #   The minimum size of the Auto Scaling group.
      #
      # @option options [required,LaunchConfiguration,String] :launch_configuration
      #   The launch configuration to use with the Auto Scaling group.
      #   This may be a {LaunchConfiguration} object or a launch configuration
      #   name string.
      #
      # @option options [required,Array<String>] :availability_zones
      #   A list of Availability Zones for the Auto Scaling group.
      #   This can be {EC2::AvailabilityZone} objects or availability
      #   zone names.
      #
      # @option options [Integer] :default_cooldown
      #   The amount of time, in seconds, after a scaling activity completes
      #   before any further trigger-related scaling activities can start.
      #
      # @option options [Integer] :desired_capacity
      #   The number of Amazon EC2 instances that should be running in
      #   the group.
      #
      # @option options [Integer] :health_check_grace_period
      #   Length of time in seconds after a new Amazon EC2 instance comes
      #   into service that Auto Scaling starts checking its health.
      #
      # @option options [Symbol] :health_check_type
      #   The service you want the health status from,
      #   Amazon EC2 or Elastic Load Balancer. Valid values are
      #   `:ec2` or `:elb`.
      #
      # @option options [String] :placement_group
      #   Physical location of your cluster placement group created in
      #   Amazon EC2. For more information about cluster placement group, see
      #   [Using Cluster Instances](http://docs.aws.amazon.com/AWSEC2/latest/UserGuide/using_cluster_computing.html).
      #
      # @option options [Array<String>] :termination_policies
      #   A standalone termination policy or a list of termination policies used
      #   to select the instance to terminate. The policies are executed in the
      #   order they are listed. For more information on creating a termination
      #   policy for your Auto Scaling group, go to
      #   [Instance Termination Policy for Your Auto Scaling Group](http://docs.aws.amazon.com/AutoScaling/latest/DeveloperGuide/us-termination-policy.html)
      #   in the Auto Scaling Developer Guide.
      #
      # @option options [Array<Hash>] :tags A list of tags to apply launched
      #   instances.  Each tag hash may have the following keys:
      #
      #     * `:key` - (required,String) The tag name.
      #     * `:value` - (String) The optional tag value.
      #     * `:propagate_at_launch` - (Boolean) Whether or not to propagate
      #       to instances, defaults to true.
      #
      # @option options [Array<EC2::Subnet>,Array<String>] :subnets
      #   A list of subnet identifiers of Amazon Virtual Private Clouds
      #   (Amazon VPCs). Ensure the subnets' Availability Zones match the
      #   Availability Zones specified.
      #
      # @return [Hash]
      #
      def group_options options

        group_opts = {}

        group_opts[:launch_configuration_name] = launch_config_opt(options) if
          options.key?(:launch_configuration)

        group_opts[:availability_zones] = az_opt(options) if
          options.key?(:availability_zones)

        group_opts[:vpc_zone_identifier] = subnets_opt(options) if
          options.key?(:subnets)

        group_opts[:health_check_type] = health_check_type_opt(options) if
          options.key?(:health_check_type)

        group_opts[:tags] = tags_opt(options) if
          options.key?(:tags)

        [
          :min_size,
          :max_size,
          :default_cooldown,
          :desired_capacity,
          :health_check_grace_period,
          :placement_group,
          :termination_policies,
        ].each do |opt|
          group_opts[opt] = options[opt] if options.key?(opt)
        end

        group_opts
      end

      def launch_config_opt options
        lc = options[:launch_configuration]
        lc.is_a?(LaunchConfiguration) ? lc.name : lc
      end

      def az_opt options
        zones = options[:availability_zones]
        zones.map {|zone| zone.is_a?(EC2::AvailabilityZone) ? zone.name : zone }
      end

      def load_balancers_opt options
        options[:load_balancers].collect do |lb|
          lb.is_a?(ELB::LoadBalancer) ? lb.name : lb
        end
      end

      def subnets_opt options
        options[:subnets].collect do |subnet|
          subnet.is_a?(EC2::Subnet) ? subnet.id : subnet
        end.join(',')
      end

      def health_check_type_opt options
        options[:health_check_type].to_s.upcase
      end

      def tags_opt options
        options[:tags].map(&:to_hash).each do |tag|
          tag[:propagate_at_launch] = true unless tag.key?(:propagate_at_launch)
        end
      end

    end
  end
end
