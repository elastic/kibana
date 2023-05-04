/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { noop } from 'lodash';

import { forwardModifyAggConfigOnSearchRequestStart } from './nested_agg_helpers';
import { IMetricAggConfig, MetricAggParam } from '../metric_agg_type';
import { parentPipelineAggWriter } from './parent_pipeline_agg_writer';

const metricAggFilter = [
  '!top_hits',
  '!top_metrics',
  '!percentiles',
  '!percentile_ranks',
  '!median',
  '!std_dev',
  '!geo_bounds',
  '!geo_centroid',
  '!filtered_metric',
  '!single_percentile',
];

export const parentPipelineType = i18n.translate(
  'data.search.aggs.metrics.parentPipelineAggregationsSubtypeTitle',
  {
    defaultMessage: 'Parent Pipeline Aggregations',
  }
);

export const parentPipelineAggHelper = {
  subtype: parentPipelineType,
  params() {
    return [
      {
        name: 'metricAgg',
        default: 'custom',
        write: parentPipelineAggWriter,
      },
      {
        name: 'customMetric',
        type: 'agg',
        allowedAggs: metricAggFilter,
        makeAgg(termsAgg, state = { type: 'count' }) {
          const metricAgg = termsAgg.aggConfigs.createAggConfig(state, { addToAggConfigs: false });
          metricAgg.id = termsAgg.id + '-metric';
          return metricAgg;
        },
        modifyAggConfigOnSearchRequestStart:
          forwardModifyAggConfigOnSearchRequestStart('customMetric'),
        write: noop,
      },
      {
        name: 'buckets_path',
        write: noop,
      },
    ] as Array<MetricAggParam<IMetricAggConfig>>;
  },

  getSerializedFormat(agg: IMetricAggConfig) {
    let subAgg;
    const customMetric = agg.getParam('customMetric');

    if (customMetric) {
      subAgg = customMetric;
    } else {
      subAgg = agg.aggConfigs.byId(agg.getParam('metricAgg'));
    }
    return subAgg ? subAgg.type.getSerializedFormat(subAgg) : {};
  },
};
