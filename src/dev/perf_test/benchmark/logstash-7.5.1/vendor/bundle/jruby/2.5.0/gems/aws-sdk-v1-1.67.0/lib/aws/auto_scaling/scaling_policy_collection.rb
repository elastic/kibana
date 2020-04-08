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
    class ScalingPolicyCollection

      include Core::Collection::WithLimitAndNextToken
      include ScalingPolicyOptions

      def initialize auto_scaling_group, options = {}
        @group = auto_scaling_group
        super
      end

      # @return [Group]
      attr_reader :group

      alias_method :auto_scaling_group, :group


      # @param [String] name The name of the policy you want to create or update.
      # @param (see ScalingPolicyOptions#scaling_policy_options)
      # @option (see ScalingPolicyOptions#scaling_policy_options)
      # @return [ScalingPolicy]
      def create name, options = {}
        scaling_policy = self[name]
        scaling_policy.put(options)
        scaling_policy
      end
      alias_method :put, :create

      # @param [String] policy_name
      # @return [ScalingPolicy]
      def [] policy_name
        ScalingPolicy.new(group, policy_name)
      end

      protected

      def _each_item next_token, limit, options = {}, &block

        options[:next_token] = next_token if next_token
        options[:max_records] = limit if limit
        options[:auto_scaling_group_name] = group.name

        resp = client.describe_policies(options)
        resp.scaling_policies.each do |details|

          scaling_policy = ScalingPolicy.new_from(
            :describe_policies, details,
            group, details.policy_name)

          yield(scaling_policy)

        end
        resp.data[:next_token]
      end

    end
  end
end
