import metricAggTemplate from '../../controls/sub_agg.html';
import _ from 'lodash';
import { AggConfig } from '../../../vis/agg_config';
import { Schemas } from '../../../vis/editors/default/schemas';
import { parentPipelineAggController } from './parent_pipeline_agg_controller';
import { parentPipelineAggWritter } from './parent_pipeline_agg_writter';
import { forwardModifyAggConfigOnSearchRequestStart } from './nested_agg_helpers';


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

const parentPipelineAggHelper = {
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
        modifyAggConfigOnSearchRequestStart: forwardModifyAggConfigOnSearchRequestStart('customMetric'),
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
  },
  getFormat: function (agg) {
    let subAgg;
    if (agg.params.customMetric) {
      subAgg = agg.params.customMetric;
    } else {
      subAgg = agg.vis.getAggConfig().byId[agg.params.metricAgg];
    }
    return subAgg.type.getFormat(subAgg);
  }
};
export { parentPipelineAggHelper };
