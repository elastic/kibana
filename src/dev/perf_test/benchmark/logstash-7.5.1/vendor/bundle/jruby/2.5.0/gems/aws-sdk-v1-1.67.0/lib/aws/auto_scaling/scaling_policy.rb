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

    #
    # @attr_reader [String] arn
    #
    # @attr_reader [String] adjustment_type
    #
    # @attr_reader [Integer] scaling_adjustment
    #
    # @attr_reader [Hash] alarms Returns a hash of alarms names (keys)
    #   to alarm ARNs (values).
    #
    # @attr_reader [Integer] cooldown
    #
    # @attr_reader [Integer] min_adjustment_step
    #
    class ScalingPolicy < Core::Resource

      include ScalingPolicyOptions

      # @api private
      def initialize auto_scaling_group, policy_name, options = {}
        @group = auto_scaling_group
        @name = policy_name
        super
      end

      # @return [Group]
      attr_reader :group

      alias_method :auto_scaling_group, :group

      # @return [String]
      attr_reader :name

      attribute :arn, :from => :policy_arn, :static => true

      attribute :adjustment_type

      attribute :scaling_adjustment

      attribute :alarms do
        translates_output do |alarms|
          alarms.inject({}) do |hash,alarm|
            hash.merge(alarm.alarm_name => alarm.alarm_arn)
          end
        end
      end

      attribute :cooldown

      attribute :min_adjustment_step

      populates_from(:describe_policies) do |resp|
        resp.scaling_policies.find do |p|
          p.policy_name == name and
          p.auto_scaling_group_name == group.name
        end
      end

      # Updates this scaling policy.
      # @param (see ScalingPolicyOptions#scaling_policy_options)
      # @option (see ScalingPolicyOptions#scaling_policy_options)
      # @return [nil]
      def update options = {}
        client_opts = scaling_policy_options(group, name, options)
        resp = client.put_scaling_policy(client_opts)
        static_attributes[:arn] = resp.policy_arn
        nil
      end
      alias_method :put, :update

      # Runs this policy against it's Auto Scaling group.
      #
      # @param [Hash] options
      #
      # @option options [Boolean] :honor_cooldown (false) Set to true if you
      #   want Auto Scaling to reject this request when the Auto Scaling
      #   group is in cooldown.
      #
      # @raise [Errors::ScalingActivityInProgress]
      #
      # @return [nil]
      #
      def execute options = {}
        client_opts = {}
        client_opts[:auto_scaling_group_name] = group.name
        client_opts[:policy_name] = name
        client_opts[:honor_cooldown] = options[:honor_cooldown] == true
        client.execute_policy(client_opts)
        nil
      end

      # Deletes this scaling policy.
      # @return [nil]
      def delete
        client_opts = {}
        client_opts[:auto_scaling_group_name] = group.name
        client_opts[:policy_name] = name
        client.delete_policy(client_opts)
        nil
      end

      # @return [Boolean] Returns true if the policy exists.
      def exists?
        client_opts = {}
        client_opts[:auto_scaling_group_name] = group.name
        client_opts[:policy_names] = [name]
        resp = client.describe_policies(client_opts)
        !resp.scaling_policies.empty?
      end

      protected

      def get_resource attr_name = nil
        client_opts = {}
        client_opts[:auto_scaling_group_name] = group.name
        client_opts[:policy_names] = [name]
        client.describe_policies(client_opts)
      end

      def resource_identifiers
        [[:group, group], [:name, name]]
      end

    end
  end
end
