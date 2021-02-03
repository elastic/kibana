/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { siblingPipelineAggWriter } from './sibling_pipeline_agg_writer';
import { forwardModifyAggConfigOnSearchRequestStart } from './nested_agg_helpers';
import { IMetricAggConfig, MetricAggParam } from '../metric_agg_type';

const metricAggFilter: string[] = [
  '!top_hits',
  '!percentiles',
  '!percentile_ranks',
  '!median',
  '!std_dev',
  '!sum_bucket',
  '!avg_bucket',
  '!min_bucket',
  '!max_bucket',
  '!derivative',
  '!moving_avg',
  '!serial_diff',
  '!cumulative_sum',
  '!geo_bounds',
  '!geo_centroid',
];
const bucketAggFilter: string[] = [];

export const siblingPipelineType = i18n.translate(
  'data.search.aggs.metrics.siblingPipelineAggregationsSubtypeTitle',
  {
    defaultMessage: 'Sibling pipeline aggregations',
  }
);

export const siblingPipelineAggHelper = {
  subtype: siblingPipelineType,
  params() {
    return [
      {
        name: 'customBucket',
        type: 'agg',
        allowedAggs: bucketAggFilter,
        default: null,
        makeAgg(agg: IMetricAggConfig, state = { type: 'date_histogram' }) {
          const orderAgg = agg.aggConfigs.createAggConfig(state, { addToAggConfigs: false });
          orderAgg.id = agg.id + '-bucket';
          return orderAgg;
        },
        modifyAggConfigOnSearchRequestStart: forwardModifyAggConfigOnSearchRequestStart(
          'customBucket'
        ),
        write: () => {},
      },
      {
        name: 'customMetric',
        type: 'agg',
        allowedAggs: metricAggFilter,
        default: null,
        makeAgg(agg: IMetricAggConfig, state = { type: 'count' }) {
          const orderAgg = agg.aggConfigs.createAggConfig(state, { addToAggConfigs: false });
          orderAgg.id = agg.id + '-metric';
          return orderAgg;
        },
        modifyAggConfigOnSearchRequestStart: forwardModifyAggConfigOnSearchRequestStart(
          'customMetric'
        ),
        write: siblingPipelineAggWriter,
      },
    ] as Array<MetricAggParam<IMetricAggConfig>>;
  },

  getSerializedFormat(agg: IMetricAggConfig) {
    const customMetric = agg.getParam('customMetric');
    return customMetric ? customMetric.type.getSerializedFormat(customMetric) : {};
  },
};
