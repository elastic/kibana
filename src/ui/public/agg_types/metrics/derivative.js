import AggTypesMetricsMetricAggTypeProvider from 'ui/agg_types/metrics/metric_agg_type';
import orderAggTemplate from 'ui/agg_types/controls/sub_agg.html';
import _ from 'lodash';
import VisAggConfigProvider from 'ui/vis/agg_config';
import VisSchemasProvider from 'ui/vis/schemas';
import { makeNestedLabel } from './lib/make_nested_label';
import { parentPipelineAggController } from './lib/parent_pipeline_agg_controller';
import { parentPipelineAggWritter } from './lib/parent_pipeline_agg_writter';

export default function AggTypeMetricDerivativeProvider(Private) {
  const MetricAggType = Private(AggTypesMetricsMetricAggTypeProvider);
  const AggConfig = Private(VisAggConfigProvider);
  const Schemas = Private(VisSchemasProvider);

  const aggFilter = ['!top_hits', '!percentiles', '!percentile_ranks', '!median', '!std_dev'];
  const orderAggSchema = (new Schemas([
    {
      group: 'none',
      name: 'orderAgg',
      title: 'Order Agg',
      aggFilter: aggFilter
    }
  ])).all[0];

  return new MetricAggType({
    name: 'derivative',
    title: 'Derivative',
    makeLabel: agg => makeNestedLabel(agg, 'derivative'),
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
        write: _.noop
      },
      {
        name: 'metricAgg',
        editor: orderAggTemplate,
        controller: parentPipelineAggController,
        write: parentPipelineAggWritter
      }
    ]
  });
}
