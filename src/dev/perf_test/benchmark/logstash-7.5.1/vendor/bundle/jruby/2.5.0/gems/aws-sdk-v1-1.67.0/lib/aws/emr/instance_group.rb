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

    # @attr_reader [String] market
    #
    # @attr_reader [String] instance_role
    #
    # @attr_reader [String,nil] bid_price
    #
    # @attr_reader [String] instance_type
    #
    # @attr_reader [String] instance_request_count
    #
    # @attr_reader [String] instance_running_count
    #
    # @attr_reader [String] state
    #
    # @attr_reader [String] last_state_change_reason
    #
    # @attr_reader [Time] created_at
    #
    # @attr_reader [Time] started_at
    #
    # @attr_reader [Time] ready_at
    #
    # @attr_reader [Time] ended_at
    #
    class InstanceGroup < Core::Resource

      # @api private
      def initialize job_flow, instance_group_id, options = {}
        @job_flow = job_flow
        @instance_group_id = instance_group_id
        super
      end

      # @return [JobFlow]
      attr_reader :job_flow

      # @return [String]
      attr_reader :instance_group_id

      alias_method :id, :instance_group_id

      # @attr_reader [String] name
      attribute :name, :static => true

      attribute :market, :static => true

      attribute :instance_role, :static => true

      attribute :bid_price, :static => true

      attribute :instance_type, :static => true

      attribute :instance_request_count

      attribute :instance_running_count

      attribute :state

      attribute :last_state_change_reason

      attribute :creation_date_time, :static => true, :alias => :created_at

      attribute :start_date_time, :alias => :started_at

      attribute :ready_date_time, :alias => :ready_at

      attribute :end_date_time, :alias => :ended_at

      populates_from(:describe_job_flows) do |resp|
        find_in_response(resp)
      end

      # Modifies the target size of this instance group.
      # @param [Integer] count
      # @return (see #modify)
      def set_instance_count count
        modify(:instance_count => count)
      end

      # @param [Hash] options
      # @option options [Integer] :count The new target size for the
      #   instance group.
      # @return [nil]
      def modify options = {}
        options[:instance_group_id] = instance_group_id
        options[:instance_count] = options.delete(:count) if options[:count]
        client.modify_instance_groups(:instance_groups => [options])
        nil
      end

      # @return [Boolean] Returns `true` if the instance group exists.
      def exists?
        !!find_in_response(get_resource)
      end

      protected

      def resource_identifiers
        [[:job_flow_id, job_flow.id], [:instance_group_id, id]]
      end

      def get_resource attr = nil
        client.describe_job_flows(:job_flow_ids => [job_flow.id])
      end

      def find_in_response resp
        data = nil
        resp.data[:job_flows].each do |job|
          if job[:job_flow_id] == job_flow.job_flow_id
            job[:instances][:instance_groups].each do |ig|
              if ig[:instance_group_id] == instance_group_id
                data = ig
              end
            end
          end
        end
        data
      end

    end
  end
end
