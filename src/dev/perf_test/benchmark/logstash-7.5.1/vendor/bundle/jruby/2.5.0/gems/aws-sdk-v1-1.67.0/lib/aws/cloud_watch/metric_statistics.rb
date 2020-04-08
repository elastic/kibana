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

    # Statistics for a metric.
    #
    # This class is an enumerable collection of data points.
    #
    # ## Enumerating Statistics
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
    # @see Core::Collection
    #
    class MetricStatistics

      include Core::Collection::Simple

      # @param [Metric] metric
      # @param [String] label
      # @param [Array<Hash>] datapoints
      def initialize metric, label, datapoints
        @metric = metric
        @label = label
        @datapoints = datapoints
      end

      # @return [Metric]
      attr_reader :metric

      # @return [String]
      attr_reader :label

      # @return [Array<Hash>]
      attr_reader :datapoints

      protected

      def _each_item options = {}
        datapoints.each do |point|
          yield(point)
        end
      end

    end
  end
end
