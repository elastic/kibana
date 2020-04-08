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

require 'time'

module AWS
  class AutoScaling

    # @attr_reader [Integer] desired_capacity
    #
    # @attr_reader [String] recurrence
    #
    # @attr_reader [Time] start_time
    #
    # @attr_reader [Time] end_time
    #
    # @attr_reader [Integer] min_size
    #
    # @attr_reader [Integer] max_size
    #
    # @attr_reader [String] arn
    #
    class ScheduledAction < Core::Resource

      # @api private
      def initialize group, name, options = {}
        @group = group
        @name = name
        super
      end

      # @return [String]
      attr_reader :name

      attr_reader :group

      # @return [String]
      def auto_scaling_group_name
        group.name
      end

      attribute :arn, :from => :scheduled_action_arn

      attribute :desired_capacity

      attribute :recurrence

      attribute :start_time

      attribute :end_time

      attribute :max_size

      attribute :min_size

      populates_from(:describe_scheduled_actions) do |resp|
        resp.scheduled_update_group_actions.find do |action|
          action.scheduled_action_name == name
        end
      end

      # Updates the scheduled action.  If you omit an option,
      # the corresponding value remains unchanged in the Auto
      # Scaling group.
      #
      # @param [Hash] options
      #
      # @option options [Integer] :desired_capacity
      #
      # @option options [String] :recurrence
      #
      # @option options [Time,String] :start_time
      #
      # @option options [Time,String] :end_time
      #
      # @option options [Integer] :min_size
      #
      # @option options [Integer] :max_size
      #
      # @return [nil]
      #
      def update options = {}
        options.update(resource_options)
        # convert times to formatted strings
        [:start_time, :end_time].each do |opt|
          if options[opt].is_a?(Time)
            options[opt] = options[opt].iso8601
          end
        end
        client.put_scheduled_update_group_action(options)
        nil
      end
      alias_method :put, :update

      # @return [Boolean]
      def exists?
        client_opts = {}
        client_opts[:scheduled_action_names] = [name]
        client_opts[:auto_scaling_group_name] = auto_scaling_group_name
        resp = client.describe_scheduled_actions(client_opts)
        !resp.scheduled_update_group_actions.empty?
      rescue Errors::ValidationError
        false
      end

      # Deletes the current scheduled action.
      # @return [nil]
      def delete
        client.delete_scheduled_action(resource_options)
        nil
      end

      protected

      def resource_identifiers
        [
          [:auto_scaling_group_name, auto_scaling_group_name],
          [:scheduled_action_name, name],
        ]
      end

      def get_resource attr_name = nil
        client_opts = {}
        client_opts[:scheduled_action_names] = [name]
        client_opts[:auto_scaling_group_name] = auto_scaling_group_name
        client.describe_scheduled_actions(client_opts)
      end

    end
  end
end
