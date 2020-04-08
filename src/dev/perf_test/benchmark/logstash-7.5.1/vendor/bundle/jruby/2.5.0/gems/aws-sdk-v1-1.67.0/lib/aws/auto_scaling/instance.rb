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

    # A small wrapper around an {EC2::Instance}.
    #
    # ## Getting Auto Scaling Instances
    #
    # If you know the EC2 instance id, you can use {InstanceCollection#[]}
    # to get the Auto Scaling instance.
    #
    #     instance = auto_scaling.instances['i-1234578']
    #     instance.health_statue #=> :healthy
    #     instance.ec2_instance #=> <AWS::EC2::Instance instance_id:i-1234578>
    #
    # ## Enumerating Auto Scaling Instances
    #
    # You can enumerate *ALL* instances like so:
    #
    #     auto_scaling = AWS::AutoScaling.new
    #     auto_scaling.instances.each do |auto_scaling_instance|
    #       # ...
    #     end
    #
    # If you want the instances for a single auto scaling group:
    #
    #     group = auto_scaling.groups['group-name']
    #     group.auto_scaling_instances.each do |instance|
    #       # ...
    #     end
    #
    # If you prefer {EC2::Instance} objects you should use
    # {Group#ec2_instances} instead.
    #
    # @attr_reader [String] auto_scaling_group_name
    #
    # @attr_reader [String] launch_configuration_name
    #
    # @attr_reader [String] health_status Returns the instance health status
    #   (e.g. 'Healthly' or 'Unhealthly').
    #
    # @attr_reader [String] availability_zone_name
    #
    # @attr_reader [String] lifecycle_state
    #
    class Instance < Core::Resource

      # @api private
      def initialize instance_id, options = {}
        @instance_id = instance_id
        super
      end

      # @return [String] instance_id Returns the EC2 id instance.
      attr_reader :instance_id

      alias_method :id, :instance_id

      attribute :auto_scaling_group_name, :static => true

      attribute :availability_zone_name,
        :from => :availability_zone,
        :static => true

      attribute :health_status

      attribute :launch_configuration_name, :static => true

      attribute :lifecycle_state

      populates_from(:describe_auto_scaling_instances) do |resp|
        resp.auto_scaling_instances.find do |i|
          i.instance_id == instance_id
        end
      end

      # describe auto scaling groups returns ALL attributes
      # except :auto_scaling_group_name
      provider(:describe_auto_scaling_groups) do |provider|
        provider.find do |resp|
          instance = nil
          resp.auto_scaling_groups.each do |group|
            group.instances.each do |i|
              instance = i if i.instance_id == instance_id
            end
          end
          instance
        end
        provider.provides(*(attributes.keys - [:auto_scaling_group_name]))
      end

      # @return [EC2::Instance]
      def ec2_instance
        EC2::Instance.new(instance_id, :config => config)
      end

      # @return [AutoScaling::Group]
      def auto_scaling_group
        Group.new(auto_scaling_group_name, :config => config)
      end
      alias_method :group, :auto_scaling_group

      # @return [EC2::AvailabilityZone]
      def availability_zone
        EC2::AvailabilityZone.new(availability_zone_name, :config => config)
      end

      # @return [LaunchConfiguration]
      def launch_configuration
        LaunchConfiguration.new(launch_configuration_name, :config => config)
      end

      # @param [String] status Sets the health status of an instance.
      #   Valid values inculde 'Healthy' and 'Unhealthy'
      #
      # @param [Hash] options
      #
      # @option options [Boolean] :respect_grace_period (false) If true,
      #   this call should respect the grace period associated with
      #   this instance's Auto Scaling group.
      #
      # @return [nil]
      #
      def set_health status, options = {}
        client_opts = {}
        client_opts[:instance_id] = instance_id
        client_opts[:health_status] = status
        client_opts[:should_respect_grace_period] =
          options[:respect_grace_period] == true
        client.set_instance_health(client_opts)
      end

      # @return [Boolean] Returns true if there exists an Auto Scaling
      #   instance with this instance id.
      def exists?
        !get_resource.auto_scaling_instances.empty?
      end

      # Terminates the current Auto Scaling instance.
      #
      # @param [Boolean] decrement_desired_capacity Specifies whether or not
      #   terminating this instance should also decrement the size of
      #   the AutoScalingGroup.
      #
      # @return [Activity] Returns an activity that represents the
      #   termination of the instance.
      #
      def terminate decrement_desired_capacity

        client_opts = {}
        client_opts[:instance_id] = instance_id
        client_opts[:should_decrement_desired_capacity] =
          decrement_desired_capacity

        resp = client.terminate_instance_in_auto_scaling_group(client_opts)

        Activity.new_from(
          :terminate_instance_in_auto_scaling_group,
          resp.activity,
          resp.activity.activity_id,
          :config => config)

      end
      alias_method :delete, :terminate

      protected

      def resource_identifiers
        [[:instance_id, instance_id]]
      end

      def get_resource attr_name = nil
        client_opts = {}
        client_opts[:instance_ids] = [instance_id]
        client.describe_auto_scaling_instances(client_opts)
      end

    end
  end
end
