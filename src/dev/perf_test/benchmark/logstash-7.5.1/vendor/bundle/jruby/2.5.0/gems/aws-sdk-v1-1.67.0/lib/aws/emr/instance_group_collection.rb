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
  class EMR
    class InstanceGroupCollection

      include Core::Collection::Simple

      # @param [JobFlow] job_flow
      # @api private
      def initialize job_flow, options = {}
        @job_flow = job_flow
        super
      end

      # @return [JobFlow]
      attr_reader :job_flow

      # @param [String] instance_group_id
      # @return [InstanceGroup] Returns an instance group with the given ID.
      def [] instance_group_id
        InstanceGroup.new(job_flow, instance_group_id)
      end

      # Adds an instance group to the job flow.
      # @param [String] role The role of the instance group in the cluster.
      # @param [String] instance_type The Amazon EC2 instance type to use.
      # @param [Integer] instance_count Target size of instances for the group.
      # @param [Hash] options
      # @option options [String] :name Friendly name given to the group.
      # @option options [String] :market Market type of the Amazon EC2
      #   instances used to create a cluster node.
      # @option opitons [Float,String] :bid_price Bid price for each Amazon
      #   EC2 instance in the instance group when launching nodes as
      #   spot instances, expressed in USD.
      # @return [InstanceGroup]
      def create role, instance_type, instance_count, options = {}

        options[:instance_role] = role
        options[:instance_type] = instance_type
        options[:instance_count] = instance_count
        options[:bid_price] = options[:bid_price].to_s if options[:bid_price]

        client_opts = {}
        client_opts[:job_flow_id] = job_flow.job_flow_id
        client_opts[:instance_groups] = [options]

        resp = client.add_instance_groups(client_opts)

        self[resp.data[:instance_group_ids].first]

      end
      alias_method :add, :create

      protected

      def _each_item options = {}
        job_flow.instance_group_details.each do |details|

          group = InstanceGroup.new_from(
            :describe_job_flows, details, job_flow,
            details[:instance_group_id])

          yield(group)

        end
      end

    end
  end
end
