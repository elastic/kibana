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

    # # AlarmCollection
    #
    # Represents alarms for an AWS account.
    #
    # ## Getting an alarm by name
    #
    # If you know the name of the alarm, you can get a reference using
    # the {#[]} method.
    #
    #     cw = AWS::CloudWatch.new
    #     alarm = cw.alarms['alarm-name']
    #
    # ## Enumerating Alarms
    #
    # You can enumerate all alarms using each (or any of the
    # methods defined in {Core::Collection}).
    #
    #     cw.alarms.each do |alarm|
    #       puts alarm.name
    #     end
    #
    # ## Filtering Alarms
    #
    # Use one of the filtering methods to reduce the number of alarms
    # returned.
    #
    #     cw.alarms.with_name_prefix('some-prefix-').each {|alarm| ... }
    #
    class AlarmCollection

      include Core::Collection::WithLimitAndNextToken

      def initialize options = {}
        @filters = options[:filters] || {}
        super
      end

      # @param [String] alarm_name
      # @return [Alarm]
      def [] alarm_name
        Alarm.new(alarm_name, :config => config)
      end

      # Creates an alarm and associates it with the specified metric.
      #
      # @param [String] alarm_name The descriptive name for the alarm.
      #   This name must be unique within the user's AWS account.
      # @param [Hash] options
      # @option options [String,required] :namespace The namespace for the
      #   alarm's associated metric.
      # @option options [String,required] :metric_name The name for the
      #   alarm's associated metric.
      # @option options [Array<Hash>] :dimensions The dimensions for the
      #   alarm's associated metric.  Each dimension must specify a
      #   `:name` and a `:value`.
      # @option (see Alarm#update)
      # @return [Alarm]
      def create alarm_name, options = {}
        options[:alarm_name] = alarm_name
        client.put_metric_alarm(options)
        self[alarm_name]
      end

      # Delete one or more alarms by name.
      #
      #     cloud_watch.alarms.delete('alarm1', 'alarm2')
      #
      # @param [String,Array<String>] alarm_names
      # @return [nil]
      def delete *alarm_names
        client.delete_alarms(:alarm_names => alarm_names.flatten)
        nil
      end

      # Returns a new collection with the given filter.
      # @param [String,Symbol] name
      # @param [String,Integer] value
      # @return [Alarm]
      def filter name, value
        filters = @filters.merge(name.to_s.to_sym => value)
        AlarmCollection.new(:filters => filters, :config => config)
      end

      # @param [String] prefix
      # @return [MetricAlarmCollection]
      def with_action_prefix prefix
        filter(:action_prefix, prefix)
      end

      # @param [String] prefix The alarm name prefix.
      # @return [MetricAlarmCollection]
      def with_name_prefix prefix
        filter(:alarm_name_prefix, prefix)
      end

      # @param [String,Array<String>] names A list of alarm names to
      #   retrieve information for.
      # @return [MetricAlarmCollection]
      def with_name *names
        filter(:alarm_names, names.flatten)
      end

      # @param [String] state The state value to be used in matching alarms.
      # @return [MetricAlarmCollection]
      def with_state_value state
        filter(:state_value, state)
      end

      protected

      def _each_item next_token, limit, options = {}, &block

        options = @filters.merge(options)

        options[:next_token] = next_token if next_token
        options[:max_records] = limit if limit

        resp = client.describe_alarms(options)
        resp.data[:metric_alarms].each do |details|

          alarm = Alarm.new_from(
            :describe_alarms,
            details,
            details[:alarm_name],
            :config => config)

          yield(alarm)

        end

        resp.data[:next_token]

      end

    end
  end
end
