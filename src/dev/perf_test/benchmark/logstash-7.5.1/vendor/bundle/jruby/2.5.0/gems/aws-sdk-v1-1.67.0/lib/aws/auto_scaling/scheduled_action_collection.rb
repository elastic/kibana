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

    class ScheduledActionCollection

      include Core::Collection::WithLimitAndNextToken

      # @api private
      def initialize options = {}
        @filters = options[:filters] || {}
        super
      end

      # Creates a scheduled scaling action for an Auto Scaling group.
      # If you leave a parameter unspecified, the corresponding attribute
      # remains unchanged in the group.
      #
      # You must specify an Auto Scaling group.  This can be implicit
      # or explicit:
      #
      #     # given explicitly
      #     auto_scaling.scheduled_actions.create('action-name', :group => 'group-name')
      #
      #     # implied by the group
      #     group = auto_scaling.groups.first
      #     group.scheduled_actions.create('action-name')
      #
      # @param [String] name
      #
      # @param [Hash] options
      #
      # @option options [Group,String] :group
      #
      # @option options [Integer] :desired_capacity
      #
      # @option options [Integer] :max_size
      #
      # @option options [Integer] :min_size
      #
      # @option options [String] :recurrence
      #
      # @option options [Time] :start_time
      #
      # @option options [Time] :end_time
      #
      # @return [ScheduledAction]
      #
      def create name, options = {}

        group = auto_scaling_group(options)

        scheduled_action = ScheduledAction.new(group, name,
          :auto_scaling_group_name => group.name,
          :config => config)

        scheduled_action.update(options)
        scheduled_action

      end
      alias_method :put, :create

      # @param [String] name The name of the scheduled action.
      # @return [ScheduledAction]
      def [] name
        if group_name = @filters[:auto_scaling_group_name]
          group = Group.new(group_name, :config => config)
          ScheduledAction.new(group, name)
        else
          msg = 'uou must filter this collection by a group to get a ' +
            'scheduled action by name'
          raise msg
        end
      end

      # Returns a new {ScheduledActionCollection} filtered
      # by the given options.
      #
      #     auto_scaling.scheduled_actions.filter(:end_time => Time.now).each do |a|
      #        # ...
      #     end
      #
      # You can chain filter calls:
      #
      #     actions = auto_scaling.scheduled_actions.
      #        filter(:group => 'auto-scaling-group-name').
      #        filter(:start_time => Time.now - 3600).
      #        filter(:end_time => Time.now)
      #
      #     actions.each {|scheduled_action| ... }
      #
      # @param [Hash] filters
      #
      # @option filters [Group,String] :group
      #
      # @option filters [Array<String>] :scheduled_actions
      #    A list of scheduled actions to be described. If this list is
      #    omitted, all scheduled actions are described. The list of
      #    requested scheduled actions cannot contain more than 50 items.
      #    If an Auto Scaling group name is provided,
      #    the results are limited to that group. If unknown scheduled
      #    actions are requested, they are ignored with no error.
      #
      # @option options [Time,String] :start_time The earliest scheduled
      #   start time to return. If `:scheduled_actions` is provided,
      #   this field will be ignored.  Should be a Time object or
      #   an iso8601 string.
      #
      # @option filters [Time,String] :end_time
      #
      # @return [ScheduledActionCollection] Returns a scheduled action
      #   collection that will filter the actions returned by the
      #   given criteria.
      #
      def filter filters = {}
        init_opts = {}
        init_opts[:config] = config
        init_opts[:filters] = @filters
        init_opts[:filters].merge!(filter_opts(filters))
        ScheduledActionCollection.new(init_opts)
      end

      protected

      def auto_scaling_group(options)

        group = options.delete(:group)
        group ||= @filters[:auto_scaling_group_name]
        group = Group.new(group, :config => config) if group.is_a?(String)

        unless group
          raise ArgumentError, 'missing required option :group'
        end

        group

      end

      def filter_opts options

        opts = {}

        if g = options[:group]
          opts[:auto_scaling_group_name] = g.is_a?(Group) ? g.name : g
        end

        if actions = options[:scheduled_actions]
          opts[:scheduled_action_names] = actions
        end

        [:end_time, :start_time].each do |opt|
          if options[opt].is_a?(Time)
            opts[opt] = options[opt].iso8601
          end
        end

        opts

      end

      def _each_item next_token, limit, options = {}, &block

        options[:next_token] = next_token if next_token
        options[:max_records] = limit if limit

        resp = client.describe_scheduled_actions(options.merge(@filters))
        resp.scheduled_update_group_actions.each do |details|

          group = Group.new(details[:auto_scaling_group_name], :config => config)

          scheduled_action = ScheduledAction.new_from(
            :describe_scheduled_actions,
            details,
            group,
            details.scheduled_action_name,
            :config => config)

          yield(scheduled_action)

        end

        resp.data[:next_token]

      end

    end
  end
end
