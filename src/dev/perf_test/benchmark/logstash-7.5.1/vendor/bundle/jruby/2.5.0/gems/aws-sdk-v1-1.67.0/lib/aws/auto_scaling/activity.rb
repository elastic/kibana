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

    # @attr_reader [String] auto_scaling_group_name
    #
    # @attr_reader [String] cause
    #
    # @attr_reader [nil,String] description
    #
    # @attr_reader [String] details
    #
    # @attr_reader [Time] start_time
    #
    # @attr_reader [nil,Time] end_time
    #
    # @attr_reader [Integer] progress
    #
    # @attr_reader [nil,String] status_code
    #
    # @attr_reader [nil,String] status_message
    #
    class Activity < Core::Resource

      # @api private
      def initialize activity_id, options = {}
        @activity_id = activity_id
        super
      end

      # @return [String]
      attr_reader :activity_id

      alias_method :id, :activity_id

      attribute :auto_scaling_group_name, :static => true

      attribute :cause, :static => true

      attribute :description, :static => true

      attribute :details

      attribute :start_time, :static => true

      attribute :end_time

      attribute :progress

      attribute :status_code

      attribute :status_message

      populates_from(:describe_scaling_activities) do |resp|
        resp.activities.find {|a| a.activity_id == activity_id }
      end

      populates_from(:terminate_instance_in_auto_scaling_group) do |resp|
        resp.activity if resp.activity.activity_id == activity_id
      end

      # @return [Group]
      def group
        Group.new(auto_scaling_group_name, :config => config)
      end

      # @return [Boolean]
      def exists?
        client_opts = {}
        client_opts[:activity_ids] = [activity_id]
        resp = client.describe_scaling_activities(client_opts)
        !resp.activities.empty?
      end

      protected

      def get_resource attr_name = nil
        client_opts = {}
        client_opts[:activity_ids] = [activity_id]
        client.describe_scaling_activities(client_opts)
      end

      def resource_identifiers
        [[:activity_id, activity_id]]
      end

    end
  end
end
