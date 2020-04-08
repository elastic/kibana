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
  class CloudWatch

    # @attr_reader [String] metric_name
    #
    # @attr_reader [String] namespace
    #
    # @attr_reader [Array<Hash>] dimensions
    #
    # @attr_reader [Boolean] enabled Indicates whether actions
    #   should be executed during any changes to the alarm's state.
    #
    # @attr_reader [Array<String>] alarm_actions The list of actions to execute
    #   when this alarm transitions into an ALARM state from any other
    #   state.
    #
    # @attr_reader [String] arn The Amazon Resource Name (ARN) of the alarm.
    #
    # @attr_reader [Time] configuration_updated_timestamp
    #   The time stamp of the last update to the alarm configuration.
    #
    # @attr_reader [String] description The description for the alarm.
    #
    # @attr_reader [String] comparison_operator The arithmetic operation to
    #   use when comparing the specified Statistic and Threshold. The
    #   specified Statistic value is used as the first operand.
    #
    # @attr_reader [Integer] evaluation_periods The number of periods over
    #   which data is compared to the specified threshold.
    #
    # @attr_reader [Array<Hash>] insufficient_data_actions The list of
    #   actions to execute when this alarm transitions into an
    #   INSUFFICIENT_DATA state
    #
    # @attr_reader [Array<Hash>] ok_actions The list of actions to execute
    #   when this alarm transitions into an OK state.
    #
    # @attr_reader [Integer] period The period in seconds over which the
    #   statistic is applied.
    #
    # @attr_reader [String] state_reason A human-readable explanation for
    #   the alarm's state.
    #
    # @attr_reader [String] state_reason_data An explanation for the alarm's
    #   state in machine-readable JSON format.
    #
    # @attr_reader [Time] state_updated_timestamp When the alarm's state
    #   last updated.
    #
    # @attr_reader [String] state_value The state value for the alarm.
    #
    # @attr_reader [Float] threshold The value against which the specified
    #   statistic is compared.
    #
    # @attr_reader [String] unit The unit of the alarm's associated metric.
    #
    class Alarm < Core::Resource

      # @api private
      def initialize alarm_name, options = {}
        @alarm_name = alarm_name
        super
      end

      # @return [String]
      attr_reader :alarm_name

      alias_method :name, :alarm_name

      attribute :namespace, :static => true

      attribute :metric_name, :static => true

      attribute :dimensions, :static => true

      attribute :actions_enabled

      alias_method :enabled, :actions_enabled

      alias_method :enabled?, :enabled

      attribute :alarm_actions

      alias_method :actions, :alarm_actions

      attribute :alarm_arn, :static => true

      alias_method :arn, :alarm_arn

      attribute :alarm_configuration_updated_timestamp

      alias_method :configuration_updated_timestamp,
        :alarm_configuration_updated_timestamp

      attribute :alarm_description

      alias_method :description, :alarm_description

      attribute :comparison_operator

      attribute :evaluation_periods

      attribute :insufficient_data_actions

      attribute :ok_actions

      attribute :period

      attribute :state_reason

      attribute :state_reason_data

      attribute :state_updated_timestamp

      attribute :state_value

      attribute :statistic

      attribute :threshold

      attribute :unit

      populates_from :describe_alarms do |resp|
        resp.data[:metric_alarms].find{|a| a[:alarm_name] == alarm_name }
      end

      populates_from :describe_alarms_for_metric do |resp|
        resp.data[:metric_alarms].find{|a| a[:alarm_name] == alarm_name }
      end

      # @return [Metric]
      def metric
        options = {}
        options[:dimensions] = dimensions unless dimensions.empty?
        options[:config] = config
        Metric.new(namespace, metric_name, options)
      end

      # Updates the metric alarm.
      #
      # @option options [String,required] :comparison_operator The arithmetic
      #   operation to use when comparing the specified Statistic and
      #   Threshold. The specified Statistic value is used as the first
      #   operand.  Valid values include:
      #
      #     * 'GreaterThanOrEqualToThreshold'
      #     * 'GreaterThanThreshold'
      #     * 'LessThanThreshold'
      #     * 'LessThanOrEqualToThreshold'
      #
      # @option options [String,required] :namespace The namespace for the
      #   alarm's associated metric.
      #
      # @option options [Integer,required] :evaluation_periods The number
      #   of periods over which data is compared to the specified threshold.
      #
      # @option options [Integer,required] :period The period in seconds
      #   over which the specified statistic is applied.
      #
      # @option options [String,required] :statistic The statistic to apply
      #   to the alarm's associated metric. Valid values include:
      #
      #     * 'SampleCount'
      #     * 'Average'
      #     * 'Sum'
      #     * 'Minimum'
      #     * 'Maximum'
      #
      # @option options [Number,required] :threshold The value against which
      #   the specified statistic is compared.
      #
      # @option options [Array<String>] :insufficient_data_actions
      #   The list of actions to execute when this alarm transitions into an
      #   INSUFFICIENT_DATA state from any other state. Each action is
      #   specified as an Amazon Resource Number (ARN). Currently the only
      #   action supported is publishing to an Amazon SNS topic or an
      #   Amazon Auto Scaling policy.
      #
      # @option options [Array<String>] :ok_actions The list of actions to
      #   execute when this alarm transitions into an OK state from any
      #   other state. Each action is specified as an Amazon Resource
      #   Number (ARN). Currently the only action supported is publishing to
      #   an Amazon SNS topic or an Amazon Auto Scaling policy.
      #
      # @option options [Boolean] :actions_enabled Indicates whether or not
      #   actions should be executed during any changes to the alarm's
      #   state.
      #
      # @option options [Array<String>] :alarm_actions The list of actions
      #   to execute when this alarm transitions into an ALARM state from
      #   any other state. Each action is specified as an Amazon Resource
      #   Number (ARN). Currently the only action supported is publishing
      #   to an Amazon SNS topic or an Amazon Auto Scaling policy.
      #   Maximum of 5 alarm actions.
      #
      # @option options [String] :alarm_description The description for
      #   the alarm.
      #
      # @option options [String] :unit The unit for the alarm's associated
      #   metric.
      #
      # @return [nil]
      def update options = {}
        options[:alarm_name] = alarm_name
        client.put_metric_alarm(options)
        nil
      end

      # Deletes the current alarm.
      # @return [nil]
      def delete
        client.delete_alarms(:alarm_names => [ alarm_name ])
        nil
      end

      # Disable the current alarm actions.
      # @return [nil]
      def disable
        client.disable_alarm_actions(:alarm_names => [ alarm_name ])
        nil
      end

      # Enable the current alarm actions.
      # @return [nil]
      def enable
        client.enable_alarm_actions(:alarm_names => [ alarm_name ])
        nil
      end

      # @return [Boolean] Returns true if this alarm exists.
      def exists?
        !get_resource.data[:metric_alarms].empty?
      end

      # Returns a collection of the history items for current alarm.
      # @return [AlarmHistoryItemCollection]
      def history_items options = {}
        AlarmHistoryItemCollection.new(:config => config).with_alarm_name(name)
      end
      alias_method :history, :history_items
      alias_method :histories, :history_items

      # Temporarily sets the state of current alarm.
      # @param [String] reason The reason that this alarm is set to this
      #   specific state (in human-readable text format).
      #
      # @param [String] value Valid values include:
      #
      #   * 'OK'
      #   * 'ALARM'
      #   * 'INSUFFICIENT_DATA'
      #
      # @param [Hash] options
      # @option options [String] :state_reason_data The reason that this
      #
      #   alarm is set to this specific state (in machine-readable JSON
      #   format)
      #
      # @return [nil]
      def set_state reason, value, options = {}
        options[:alarm_name] = alarm_name
        options[:state_reason] = reason
        options[:state_value] = value
        client.set_alarm_state(options)
        nil
      end

      protected

      def resource_identifiers
        [[:alarm_name, alarm_name]]
      end

      def get_resource attr_name = nil
        client.describe_alarms(:alarm_names => [ alarm_name ])
      end

    end
  end
end
