import AggTypesMetricsMetricAggTypeProvider from 'ui/agg_types/metrics/metric_agg_type';
import orderAggTemplate from 'ui/agg_types/controls/sub_agg.html';
import _ from 'lodash';
import $ from 'jquery';
import VisAggConfigProvider from 'ui/vis/agg_config';
import VisSchemasProvider from 'ui/vis/schemas';

export default function AggTypeMetricDerivativeProvider(Private) {
  const DerivativeAggType = Private(AggTypesMetricsMetricAggTypeProvider);
  const AggConfig = Private(VisAggConfigProvider);
  const Schemas = Private(VisSchemasProvider);

  const aggFilter = ['!top_hits', '!percentiles', '!median', '!std_dev'];
  const orderAggSchema = (new Schemas([
    {
      group: 'none',
      name: 'orderAgg',
      title: 'Order Agg',
      aggFilter: aggFilter
    }
  ])).all[0];

  return new DerivativeAggType({
    name: 'serial_diff',
    title: 'Serial diff',
    makeLabel: function (aggConfig) {
      if (aggConfig.params.customMetric) {
        let label = aggConfig.params.customMetric.makeLabel();
        if (label.includes('Serial diff of ')) {
          label = '2. serial diff of ' + label.substring('Serial diff of '.length);
        }
        else if (label.includes('serial diff of ')) {
          label = (parseInt(label.substring(0, 1)) + 1) + label.substring(1);
        }
        else {
          label = 'Serial diff of ' + label;
        }
        return label;
      }
      const metric = aggConfig.vis.aggs.find(agg => agg.id === aggConfig.params.buckets_path);
      return 'Serial diff of ' + metric.makeLabel();
    },
    params: [
      {
        name: 'customMetric',
        type: AggConfig,
        default: null,
        serialize: function (customMetric) {
          return customMetric.toJSON();
        },
        deserialize: function (state, agg) {
          return this.makeAgg(agg, state);
        },
        makeAgg: function (termsAgg, state) {
          state = state || {};
          state.schema = orderAggSchema;
          const orderAgg = new AggConfig(termsAgg.vis, state);
          orderAgg.id = termsAgg.id + '-orderAgg';
          return orderAgg;
        },
        write: _.noop
      },
      {
        name: 'buckets_path',
        editor: orderAggTemplate,
        controller: function ($scope, $element) {

          $scope.safeMakeLabel = function (agg) {
            try {
              return agg.makeLabel();
            } catch (e) {
              return '- agg not valid -';
            }
          };

          $scope.$watch('responseValueAggs', updateOrderAgg);
          $scope.$watch('agg.params.buckets_path', updateOrderAgg);

          $scope.$on('$destroy', function () {
            if ($scope.aggForm && $scope.aggForm.agg) {
              $scope.aggForm.agg.$setValidity('bucket', true);
            }
          });

          // Returns true if the agg is not compatible with the terms bucket
          $scope.rejectAgg = function (agg) {
            // aggFilter elements all starts with a '!'
            // so the index of agg.type.name in a filter is 1 if it is included
            return Boolean(aggFilter.find((filter) => filter.indexOf(agg.type.name) === 1));
          };

          function checkBuckets() {
            const buckets = $scope.vis.aggs.filter(agg => agg.schema.group === 'buckets');
            const bucketIsHistogram = ['date_histogram', 'histogram'].includes(buckets[0].type.name);
            const canUseDerivative = buckets.length === 1 && bucketIsHistogram;
            if ($scope.aggForm.agg) $scope.aggForm.agg.$setValidity('bucket', canUseDerivative);
            if (canUseDerivative) {
              if (buckets[0].type.name === 'histogram') {
                buckets[0].params.min_doc_count = 1;
              }
              else {
                buckets[0].params.min_doc_count = 0;
              }
            }
          }

          function updateOrderAgg() {
            const agg = $scope.agg;
            const params = agg.params;
            const bucketsPath = params.buckets_path;
            const paramDef = agg.type.params.byName.customMetric;

            checkBuckets();

            // we aren't creating a custom aggConfig
            if (bucketsPath !== 'custom') {
              params.customMetric = null;
              return;
            }

            params.customMetric = params.customMetric || paramDef.makeAgg(agg);
          }
        },
        write: function (agg, output) {
          const vis = agg.vis;
          const orderAgg = agg.params.customMetric || vis.aggs.getResponseAggById(agg.params.buckets_path);

          if (agg.params.customMetric && agg.params.customMetric.type.name !== 'count') {
            output.parentAggs = (output.parentAggs || []).concat(orderAgg);
          }

          output.params = {};
          if (orderAgg.type.name === 'count') {
            output.params.buckets_path = '_count';
          } else {
            output.params.buckets_path = orderAgg.id;
          }
        }
      }
    ]
  });
}
