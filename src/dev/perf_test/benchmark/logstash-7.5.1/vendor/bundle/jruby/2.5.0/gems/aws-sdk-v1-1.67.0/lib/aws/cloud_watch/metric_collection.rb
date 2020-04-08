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
    class MetricCollection

      include Core::Collection::WithNextToken

      # @api private
      def initialize options = {}
        @filters = options[:filters] || {}
        super
      end

      # Returns a new collection that will filter results when enumerated.
      #
      # @example Filtering by a namespace
      #
      #   traffic_metrics = metrics.filter('namespace', 'traffic')
      #
      # @example Filtering by a metric name
      #
      #   my_metric = metrics.filter('metric_name', 'my-metric').first
      #
      # @example Filtering by one or more dimensions
      #
      #   metrics = metrics.filter('dimensions', [
      #     { :name => 'n1', :value => 'v1' },
      #     { :name => 'n2', :value => 'v2' },
      #     { :name => 'n3', :value => 'v3' },
      #   ])
      #
      # @param [String,Symbol] name
      # @param [String,Array<String>] value
      # @return [MetricCollection]
      def filter name, value
        filters = @filters.merge(name.to_s.to_sym => value)
        MetricCollection.new(:filters => filters, :config => config)
      end

      # @param [String] namespace
      # @return [MetricCollection]
      def with_namespace namespace
        filter(:namespace, namespace)
      end

      # @param [String] name
      # @return [MetricCollection]
      def with_metric_name name
        filter(:metric_name, name)
      end

      # Returns a collection filtered by the given dimension:
      #
      #     metric = metrics.with_dimension('name', 'value').first
      #
      # You can chain calls to #with_dimension.  Additional dimensions are
      # added.
      #
      #     metrics = metrics.
      #       with_dimension('d1', 'v1').
      #       with_dimension('d2', 'v2').
      #       with_dimension('d3', 'v3')
      #
      #     metrics.each{|metric|} # filtered by all three dimensions
      #
      # @param [String] name
      # @param [String] value
      # @return [MetricCollection]
      def with_dimension name, value
        with_dimensions([{ :name => name, :value => value }])
      end

      # Returns a collection filtered by the given dimensions.
      #
      #     metrics.with_dimensions([
      #       { :name => 'd1', :value => 'v1' },
      #       { :name => 'd2', :value => 'v2' },
      #       { :name => 'd3', :value => 'v3' },
      #     ]).each do |metric|
      #       # ...
      #     end
      #
      # Multiple calls to #with_dimensions will add to previous dimensions.
      # @param [Array<Hash>] dimensions An array of dimensions.  Each dimension
      #   should be a Hash with a `:name` and `:value`.
      # @return [MetricCollection]
      def with_dimensions *dimensions
        filter(:dimensions, (@filters[:dimensions] || []) + dimensions.flatten )
      end

      protected

      def _each_item next_token, options = {}, &block

        options = @filters.merge(options)
        options[:next_token] = next_token if next_token

        resp = client.list_metrics(options)
        resp.data[:metrics].each do |details|

          metric = Metric.new_from(
            :list_metrics, details,
            details[:namespace],
            details[:metric_name],
            details.merge(:config => config))

          yield(metric)

        end

        resp.data[:next_token]

      end

    end
  end
end
