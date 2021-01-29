/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { MetricAggType } from './metric_agg_type';
import { aggMovingAvgFnName } from './moving_avg_fn';
import { parentPipelineAggHelper } from './lib/parent_pipeline_agg_helper';
import { makeNestedLabel } from './lib/make_nested_label';
import { METRIC_TYPES } from './metric_agg_types';
import { AggConfigSerialized, BaseAggParams } from '../types';

export interface AggParamsMovingAvg extends BaseAggParams {
  buckets_path?: string;
  window?: number;
  script?: string;
  customMetric?: AggConfigSerialized;
  metricAgg?: string;
}

const movingAvgTitle = i18n.translate('data.search.aggs.metrics.movingAvgTitle', {
  defaultMessage: 'Moving Avg',
});

const movingAvgLabel = i18n.translate('data.search.aggs.metrics.movingAvgLabel', {
  defaultMessage: 'moving avg',
});

export const getMovingAvgMetricAgg = () => {
  const { subtype, params, getSerializedFormat } = parentPipelineAggHelper;

  return new MetricAggType({
    name: METRIC_TYPES.MOVING_FN,
    expressionName: aggMovingAvgFnName,
    dslName: 'moving_fn',
    title: movingAvgTitle,
    makeLabel: (agg) => makeNestedLabel(agg, movingAvgLabel),
    subtype,
    getSerializedFormat,
    params: [
      ...params(),
      {
        name: 'window',
        default: 5,
      },
      {
        name: 'script',
        default: 'MovingFunctions.unweightedAvg(values)',
      },
    ],
    getValue(agg, bucket) {
      /**
       * The previous implementation using `moving_avg` did not
       * return any bucket in case there are no documents or empty window.
       * The `moving_fn` aggregation returns buckets with the value null if the
       * window is empty or doesn't return any value if the sibiling metric
       * is null. Since our generic MetricAggType.getValue implementation
       * would return the value 0 for null buckets, we need a specific
       * implementation here, that preserves the null value.
       */
      return bucket[agg.id] ? bucket[agg.id].value : null;
    },
  });
};
