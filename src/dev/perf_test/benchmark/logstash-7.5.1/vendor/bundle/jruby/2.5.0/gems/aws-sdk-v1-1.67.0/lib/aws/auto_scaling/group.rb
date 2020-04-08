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

    # @attr_reader [String] arn
    #
    # @attr_reader [Array<String>] availability_zone_names
    #
    # @attr_reader [Time] created_time
    #
    # @attr_reader [Integer] default_cooldown
    #
    # @attr_reader [Integer] desired_capacity
    #
    # @attr_reader [Array<Hash>] enabled_metrics Returns a hash of enabled
    #   metric names (keys) and granularities (values).
    #
    # @attr_reader [Integer] health_check_grace_period
    #
    # @attr_reader [Symbol] health_check_type Returns :ec2 or :vpc.
    #
    # @attr_reader [String] launch_configuration_name
    #
    # @attr_reader [Array<String>] load_balancer_names
    #
    # @attr_reader [Integer] min_size
    #
    # @attr_reader [Integer] max_size
    #
    # @attr_reader [String,nil] placement_group
    #
    # @attr_reader [Hash] suspended_processes A hash of suspended process
    #   names (keys) and reasons (values).
    #
    class Group < Core::Resource

      include GroupOptions

      def initialize name, options = {}
        @name = name
        super
      end

      # @return [String]
      attr_reader :name

      attribute :auto_scaling_group_arn, :static => true

      alias_method :arn, :auto_scaling_group_arn

      attribute :availability_zone_names, :from => :availability_zones

      attribute :created_time, :static => true

      attribute :default_cooldown

      attribute :desired_capacity

      attribute :enabled_metrics do
        translates_output do |metrics|
          metrics.inject({}) do |hash,metric|
            hash.merge(metric.metric => metric.granularity)
          end
        end
      end

      attribute :health_check_grace_period

      attribute :health_check_type, :to_sym => true

      attribute :instances

      protected :instances

      attribute :launch_configuration_name

      attribute :load_balancer_names, :static => true

      attribute :min_size

      attribute :max_size

      attribute :placement_group

      attribute :termination_policies

      attribute :suspended_processes do
        translates_output do |processes|
          processes.inject({}) do |hash,process|
            hash.merge(process.process_name => process.suspension_reason)
          end
        end
      end

      attribute :tag_details, :from => :tags

      protected :tag_details

      attribute :vpc_zone_identifier

      protected :vpc_zone_identifier

      populates_from(:describe_auto_scaling_groups) do |resp|
        resp.auto_scaling_groups.find{|g| g.auto_scaling_group_name == name }
      end

      # @return [ScalingPolicyCollection]
      def scaling_policies
        ScalingPolicyCollection.new(self)
      end

      # @return [NotificationConfigurationCollection]
      def notification_configurations
        NotificationConfigurationCollection.new(:group => self)
      end

      # @return [ScheduledActionCollection]
      def scheduled_actions
        actions = ScheduledActionCollection.new(:config => config)
        actions.filter(:group => self)
      end

      # @return [Tag]
      def tags
        tag_details.collect do |tag|
          Tag.new(tag.to_hash.merge(:config => config))
        end
      end

      # @return [LaunchConfiguration]
      def launch_configuration
        LaunchConfiguration.new(launch_configuration_name, :config => config)
      end

      # @return [ActivityCollection]
      def activities
        ActivityCollection.new(:group => self)
      end

      # @return [Array<AutoScaling::Instance>]
      def auto_scaling_instances
        instances.collect do |details|
          Instance.new_from(
            :describe_auto_scaling_groups,
            details,
            details.instance_id,
            :auto_scaling_group_name => name, # not provided by the response
            :config => config)
        end
      end

      # Returns a collection that represents the instances belonging to this
      # Auto Scaling group.  You can use this collection to further refine
      # the instances you are interested in:
      #
      #     group.ec2_instances.filter('availability-zone', 'us-west-2a').each do |i|
      #       puts instance.id
      #     end
      #
      # @return [EC2::InstanceCollection] Returns an instance collection
      #   (without making a request) that represents the instances
      #   belonging to this Auto Scaling group.
      #
      def ec2_instances
        instances = EC2::InstanceCollection.new(:config => config)
        instances.filter('tag:aws:autoscaling:groupName', name)
      end

      # @return [Array<EC2::Subnet>]
      def subnets
        vpc_zone_identifier.to_s.split(/,/).collect do |subnet_id|
          EC2::Subnet.new(subnet_id, :config => config)
        end
      end

      # @return [Array<EC2::AvailabilityZone>]
      def availability_zones
        availability_zone_names.collect do |az_name|
          EC2::AvailabilityZone.new(az_name, :config => config)
        end
      end

      # @return [Array,<ELB::LoadBalancer>]
      def load_balancers
        load_balancer_names.collect do |name|
          ELB::LoadBalancer.new(name, :config => config)
        end
      end

      # Adjusts the desired size of the Auto Scaling group by initiating
      # scaling activities. When reducing the size of the group, it is
      # not possible to define which Amazon EC2 instances will be
      # terminated. This applies to any Auto Scaling decisions that might
      # result in terminating instances.
      #
      # @param [Integer] capacity The new capacity setting for this Auto
      #   Scaling group.
      #
      # @param [Hash] options
      #
      # @option options [Boolean] :honor_cooldown (false)
      #
      # @return [nil]
      #
      def set_desired_capacity capacity, options = {}
        client_opts = {}
        client_opts[:auto_scaling_group_name] = name
        client_opts[:desired_capacity] = capacity
        client_opts[:honor_cooldown] = options[:honor_cooldown] == true
        client.set_desired_capacity(client_opts)
        nil
      end

      # Suspends processes for this Auto Scaling group.
      #
      #     # suspend two processes by name
      #     auto_scaling_group.suspend_processes 'Launch', 'AZRebalance'
      #
      # @param [Array<String>] processes A list of process to suspend.
      #
      # @return [nil]
      #
      def suspend_processes *processes
        client_opts = {}
        client_opts[:auto_scaling_group_name] = name
        client_opts[:scaling_processes] = processes.flatten
        client.suspend_processes(client_opts)
        nil
      end

      # Suspends all processes for this Auto Scaling group.
      # @return [nil]
      def suspend_all_processes
        suspend_processes
      end

      # Resumes processes for this Auto Scaling group.
      #
      #     # resume two processes by name
      #     auto_scaling_group.suspend_processes 'Launch', 'AZRebalance'
      #
      # @param [Array<String>] processes A list of process to resume.
      #
      # @return [nil]
      #
      def resume_processes *processes
        client_opts = {}
        client_opts[:auto_scaling_group_name] = name
        client_opts[:scaling_processes] = processes.flatten
        client.resume_processes(client_opts)
        nil
      end

      # Resumes all processes for this Auto Scaling group.
      # @return [nil]
      def resume_all_processes
        resume_processes
      end

      # @param [Array<String>] metrics A list of metrics to collect.
      # @return [nil]
      def enable_metrics_collection *metrics
        client_opts = {}
        client_opts[:auto_scaling_group_name] = name
        client_opts[:granularity] = '1Minute'
        client_opts[:metrics] = metrics.flatten
        client.enable_metrics_collection(client_opts)
        nil
      end

      # Enables all metrics collection for the Auto Scaling group.
      # @return [nil]
      def enable_all_metrics_collection
        enable_metrics_collection
      end

      # @param [Array<String>] metrics A list of metrics to collect.
      # @return [nil]
      def disable_metrics_collection *metrics
        client_opts = {}
        client_opts[:auto_scaling_group_name] = name
        client_opts[:metrics] = metrics.flatten
        client.disable_metrics_collection(client_opts)
        nil
      end

      # Disables all metrics collection for the Auto Scaling group.
      # @return [nil]
      def disable_all_metrics_collection
        disable_metrics_collection
      end

      # Update one or more attributes on the Auto Scaling group.
      #
      # @param (see GroupOptions#group_options)
      #
      # @option (see GroupOptions#group_options)
      #
      # @return [nil]
      #
      def update options = {}

        group_opts = group_options(options)

        # tags must be updated using a separate request from the
        # other attributes, *sigh*
        if tags = group_opts.delete(:tags)
          tags.map(&:to_hash).each do |tag|
            tag[:resource_type] = 'auto-scaling-group'
            tag[:resource_id] = name
          end
          client.create_or_update_tags(:tags => tags)
        end

        unless group_opts.empty?
          client_opts = group_opts.merge(:auto_scaling_group_name => name)
          client.update_auto_scaling_group(client_opts)
        end

        nil

      end

      # Deletes specific tags from this Auto Scaling group.
      #
      #     group.delete_tags([
      #       { :key => 'role', :value => 'webserver' },
      #     ])
      #
      # You may also pass {Tag} objects.
      #
      # @param [Array<Tag,Hash>] tags An array of {Tag} objects or
      #   tag hashes to remove. If you pass hashes they should have
      #   the following keys:
      #     * `:key`
      #     * `:value`
      #     * `:propagate_at_launch`
      #
      # @return [nil]
      #
      def delete_tags *tags
        tags = tags.flatten.collect do |tag|
          tag.to_hash.merge(
            :resource_type => 'auto-scaling-group',
            :resource_id => name)
        end
        client.delete_tags(:tags => tags)
        nil
      end

      # Removes all tags from this Auto Scaling group.
      # @return [nil]
      def delete_all_tags
        delete_tags(self.tags)
        nil
      end

      # Deletes the Auto Scaling group.  If you pass `:force` as true
      # then all the instances associated with this group will also
      # be terminated.
      #
      # @see #delete!
      #
      # @param [Hash] options
      #
      # @option options [Boolean] :force (false) When true, the Auto Scaling
      #   group will be deleted along with all instances associated with
      #   the group, without waiting for all instances to be terminated.
      #
      # @return [nil]
      #
      def delete options = {}
        client_opts = {}
        client_opts[:force_delete] = options[:force] == true
        client_opts[:auto_scaling_group_name] = name
        client.delete_auto_scaling_group(client_opts)
        nil
      end

      # Deletes the Auto Scaling group along with all instances
      # associated with the group, without waiting for all instances
      # to be terminated.
      # @return [nil]
      def delete!
        delete(:force => true)
        nil
      end

      # @return [Boolean]
      def exists?
        client_opts = {}
        client_opts[:auto_scaling_group_names] = [name]
        resp = client.describe_auto_scaling_groups(client_opts)
        !resp.auto_scaling_groups.empty?
      end

      protected

      def resource_identifiers
        [[:name, name]]
      end

      def get_resource attr_name = nil
        client.describe_auto_scaling_groups(:auto_scaling_group_names => [name])
      end

    end
  end
end
