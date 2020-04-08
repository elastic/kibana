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

require 'date'
require 'time'

module AWS
  class CloudWatch

    # # Metric
    #
    # Represents a single metric.
    #
    class Metric < Core::Resource

      # @param [String] namespace The metric namespace.
      # @param [String] metric_name The metric name.
      # @param [Hash] options
      # @option options [Array<Hash>] :dimensions An array of dimensions.
      #   Each hash must have a `:name` and a `value` key (with string values).
      def initialize namespace, metric_name, options = {}
        @namespace = namespace
        @metric_name = metric_name
        @dimensions = options[:dimensions] || []
        super
      end

      # @return [String]
      attr_reader :namespace

      # @return [String]
      attr_reader :metric_name

      alias_method :name, :metric_name

      # @return [Array<Hash>]
      attr_reader :dimensions

      # @return [MetricAlarmCollection]
      def alarms
        MetricAlarmCollection.new(self, :config => config)
      end

      # Publishes metric data points to Amazon CloudWatch.
      # @param [Array<Hash>] metric_data An array of hashes.  Each hash
      #   must pass `:value` (number) or `:statistic_values` (hash).
      # @return [nil]
      def put_data *metric_data

        metric_opts = {}
        metric_opts[:metric_name] = metric_name
        metric_opts[:dimensions] = dimensions unless dimensions.empty?

        options = {}
        options[:namespace] = namespace
        options[:metric_data] = metric_data.flatten.map do |data|
          data.merge(metric_opts)
        end

        client.put_metric_data(options)
        nil

      end

      # Gets statistics for this metric.
      #
      #     metric = CloudWatch::Metric.new('my/namepace', 'metric-name')
      #
      #     stats = metric.statistics(
      #       :start_time => Time.now - 3600,
      #       :end_time => Time.now,
      #       :statistics => ['Average'])
      #
      #     stats.label #=> 'some-label'
      #     stats.each do |datapoint|
      #       # datapoint is a hash
      #     end
      #
      # @param [Hash] options
      # @option options [Time,required] :start_time
      # @option options [Time,required] :end_time
      # @option options [Array<String>,required] :statistics
      # @option options [String] :unit
      # @option options [Integer] :period (60)
      # @return [MetricStatistics]
      def statistics options = {}

        start = options.delete(:start_time)
        stop = options.delete(:end_time)

        options[:namespace] = namespace
        options[:metric_name] = metric_name
        options[:dimensions] = dimensions unless dimensions.empty?
        options[:start_time] = start.respond_to?(:iso8601) ? start.iso8601 : start
        options[:end_time] = stop.respond_to?(:iso8601) ? stop.iso8601 : stop
        options[:period] ||= 60

        resp = client.get_metric_statistics(options)

        MetricStatistics.new(self, resp[:label], resp[:datapoints])

      end

      # @return [Boolean] Returns `true` if this metric exists.
      def exists?
        !get_resource.data[:metrics].empty?
      end

      protected

      def resource_identifiers
        [
          [:namespace, namespace],
          [:metric_name, metric_name],
          [:dimensions, dimensions],
        ]
      end

      def get_resource attr_name = nil
        client.list_metrics(resource_options)
      end

    end
  end
end
