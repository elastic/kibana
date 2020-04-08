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

    class GroupCollection

      include GroupOptions
      include Core::Collection::WithLimitAndNextToken

      # Creates an Auto Scaling Group.
      #
      #     group = auto_scaling.groups.create('group-name',
      #       :launch_configuration => 'launch-config-name',
      #       :availability_zones => %(us-west-2a us-west-2b),
      #       :min_size => 1,
      #       :max_size => 4)
      #
      # @param [String] name The name of the Auto Scaling group.
      #   Must be unique within the scope of your AWS account.
      #
      # @param [Hash] options
      #
      # @option (see GroupOptions#group_options)
      #
      # @option options [Array<ELB::LoadBalancer>,Array<String>] :load_balancers
      #   A list of load balancers to use.  This can be an array of
      #   {ELB::LoadBalancer} objects or an array of load balancer names.
      #
      # @return [Group]
      #
      def create name, options = {}

        unless options[:launch_configuration]
          raise ArgumentError, 'missing required option :launch_configuration'
        end

        group_opts = group_options(options)
        group_opts[:auto_scaling_group_name] = name

        if balancers = options[:load_balancers]
          group_opts[:load_balancer_names] = balancers.collect do |balancer|
            balancer.is_a?(ELB::LoadBalancer) ? balancer.name : balancer
          end
        end

        client.create_auto_scaling_group(group_opts)

        self[name]

      end

      # @param [String] name The name of the Auto Scaling group.
      # @return [Group]
      def [] name
        Group.new(name, :config => config)
      end

      protected

      def _each_item next_token, limit, options = {}, &block

        options[:next_token] = next_token if next_token
        options[:max_records] = limit if limit

        resp = client.describe_auto_scaling_groups(options)
        resp.auto_scaling_groups.each do |details|

          group = Group.new_from(
            :describe_auto_scaling_groups,
            details,
            details.auto_scaling_group_name,
            :config => config)

          yield(group)

        end

        resp.data[:next_token]

      end

    end
  end
end
