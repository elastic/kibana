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

    # # MetricAlarmCollection
    #
    # Represents all alarms for a single metric.
    #
    # ## Getting an alarm by name
    #
    # If you know the name of the alarm, you can get a reference using
    # the {#[]} method.
    #
    #     metric.alarms['alarm-name']
    #
    # ## Enumerating Alarms
    #
    # You can enumerate all alarms for a metric using each (or any of the
    # methods defined in {Core::Collection}).
    #
    #     metric.alarms.each do |alarm|
    #       puts alarm.name
    #     end
    #
    # ## Filtering Alarms
    #
    # Use one of the filtering methods to reduce the number of alarms
    # returned.
    #
    #     metric.alarms.with_unit('Seconds').each {|alarm| ... }
    #
    class MetricAlarmCollection < AlarmCollection

      include Core::Collection::Simple

      # @api private
      def initialize metric, options = {}
        @metric = metric
        super(options.merge(:config => metric.config))
      end

      # @return [Metric]
      attr_reader :metric

      # @param [String] alarm_name
      # @return [Alarm]
      def [] alarm_name
        options = {}
        options[:namespace] = metric.namespace
        options[:metric_name] = metric.name
        options[:dimensions] = metric.dimensions unless metric.dimensions.empty?
        options[:config] = config
        Alarm.new(alarm_name, options)
      end

      # Creates an alarm for this metric.
      # @param (see AlarmCollection#create)
      # @option (see MetricAlarm#update)
      # @return (see AlarmCollection#create)
      def create alarm_name, options = {}
        options[:namespace] = metric.namespace
        options[:metric_name] = metric.metric_name
        options[:dimensions] = metric.dimensions unless metric.dimensions.empty?
        super(alarm_name, options)
      end

      # Returns a new collection that will filter results when enumerated.
      #
      # @example Filtering by a 1 hour period
      #
      #     metric.alarms.filter('period', 3600)
      #
      # @example Filtering by statistic
      #
      #     my_metric = metrics.filter('statistic', 'maximum')
      #
      # @example Filtering by a unit
      #
      #     metrics = metrics.filter('unit', 'Megabits')
      #
      # @param [String,Symbol] name
      # @param [String,Integer] value
      # @return [MetricAlarmCollection]
      def filter name, value
        filters = @filters.merge(name.to_s.to_sym => value)
        MetricAlarmCollection.new(metric, :filters => filters)
      end

      # Returns a new collection that filters alarms by a period.
      #
      #     metric.alarms.with_period(3600).each {|alarm| ... }
      #
      # @param [Integer] period
      # @return [MetricAlarmCollection]
      def with_period period
        filter(:period, period)
      end

      # Returns a new collection that filters alarms by a statistic.
      #
      #     metric.alarms.with_statistic('Average').each {|alarm| ... }
      #
      # @param [String] statistic
      # @return [MetricAlarmCollection]
      def with_statistic statistic
        filter(:statistic, statistic)
      end

      # Returns a new collection that filters alarms by a unit.
      #
      #     metric.alarms.with_unit('Percent').each {|alarm| ... }
      #
      # @param [String] unit
      # @return [MetricAlarmCollection]
      def with_unit unit
        filter(:unit, unit)
      end

      protected

      def _each_item options = {}, &block

        options = @filters.merge(options)

        options[:namespace] = metric.namespace
        options[:metric_name] = metric.metric_name
        options[:dimensions] = metric.dimensions unless metric.dimensions.empty?

        resp = client.describe_alarms_for_metric(options)
        resp.data[:metric_alarms].each do |details|

          alarm = Alarm.new_from(
            :describe_alarms_for_metric,
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
