import metricAggTemplate from 'ui/agg_types/controls/sub_agg.html';
import _ from 'lodash';
import VisAggConfigProvider from 'ui/vis/agg_config';
import VisSchemasProvider from 'ui/vis/schemas';
import { parentPipelineAggController } from './parent_pipeline_agg_controller';
import { parentPipelineAggWritter } from './parent_pipeline_agg_writter';

const ParentPipelineAggHelperProvider = function (Private) {

  const AggConfig = Private(VisAggConfigProvider);
  const Schemas = Private(VisSchemasProvider);

  const metricAggFilter = ['!top_hits', '!percentiles', '!percentile_ranks', '!median', '!std_dev'];
  const metricAggSchema = (new Schemas([
    {
      group: 'none',
      name: 'metricAgg',
      title: 'Metric Agg',
      hideCustomLabel: true,
      aggFilter: metricAggFilter
    }
  ])).all[0];

  return {
    subtype: 'Parent Pipeline Aggregations',
    params: function () {
      return [
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
            state = state || { type: 'count' };
            state.schema = metricAggSchema;
            const metricAgg = new AggConfig(termsAgg.vis, state);
            metricAgg.id = termsAgg.id + '-metric';
            return metricAgg;
          },
          write: _.noop
        },
        {
          name: 'buckets_path',
          write: _.noop
        },
        {
          name: 'metricAgg',
          editor: metricAggTemplate,
          default: 'custom',
          controller: parentPipelineAggController,
          write: parentPipelineAggWritter
        }
      ];
    }
  };
};

export default ParentPipelineAggHelperProvider;
