import _ from 'lodash';
import { AggConfig } from '../../../vis/agg_config';
import { Schemas } from '../../../vis/editors/default/schemas';

import { siblingPipelineAggController } from './sibling_pipeline_agg_controller';
import { siblingPipelineAggWritter } from './sibling_pipeline_agg_writter';
import metricAggTemplate from '../../controls/sub_metric.html';
import { forwardModifyAggConfigOnSearchRequestStart } from './nested_agg_helpers';

const metricAggFilter = [
  '!top_hits', '!percentiles', '!percentile_ranks', '!median', '!std_dev',
  '!sum_bucket', '!avg_bucket', '!min_bucket', '!max_bucket',
  '!derivative', '!moving_avg', '!serial_diff', '!cumulative_sum'
];

const metricAggSchema = (new Schemas([
  {
    group: 'none',
    name: 'metricAgg',
    title: 'Metric Agg',
    aggFilter: metricAggFilter
  }
])).all[0];

const bucketAggFilter = [];
const bucketAggSchema = (new Schemas([
  {
    group: 'none',
    title: 'Bucket Agg',
    name: 'bucketAgg',
    aggFilter: bucketAggFilter
  }
])).all[0];

const siblingPipelineAggHelper = {
  subtype: 'Sibling Pipeline Aggregations',
  params: function () {
    return [
      {
        name: 'customBucket',
        type: AggConfig,
        default: null,
        serialize: function (customMetric) {
          return customMetric.toJSON();
        },
        deserialize: function (state, agg) {
          return this.makeAgg(agg, state);
        },
        makeAgg: function (agg, state) {
          state = state || { type: 'date_histogram' };
          state.schema = bucketAggSchema;
          const orderAgg = new AggConfig(agg.vis, state);
          orderAgg.id = agg.id + '-bucket';
          return orderAgg;
        },
        editor: metricAggTemplate,
        controller: siblingPipelineAggController('customBucket'),
        modifyAggConfigOnSearchRequestStart: forwardModifyAggConfigOnSearchRequestStart('customBucket'),
        write: _.noop
      },
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
        makeAgg: function (agg, state) {
          state = state || { type: 'count' };
          state.schema = metricAggSchema;
          const orderAgg = new AggConfig(agg.vis, state);
          orderAgg.id = agg.id + '-metric';
          return orderAgg;
        },
        editor: metricAggTemplate,
        controller: siblingPipelineAggController('customMetric'),
        modifyAggConfigOnSearchRequestStart: forwardModifyAggConfigOnSearchRequestStart('customMetric'),
        write: siblingPipelineAggWritter
      }
    ];
  },
  getFormat: function (agg) {
    return agg.params.customMetric.type.getFormat(agg.params.customMetric);
  }
};

export { siblingPipelineAggHelper };
