/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { IMetricAggConfig } from '../metric_agg_type';
import { METRIC_TYPES } from '../metric_agg_types';

export const siblingPipelineAggWriter = (agg: IMetricAggConfig, output: Record<string, any>) => {
  const customMetric = agg.getParam('customMetric');

  if (!customMetric) return;

  const metricAgg = customMetric;
  const bucketAgg = agg.getParam('customBucket');

  // if a bucket is selected, we must add this agg as a sibling to it, and add a metric to that bucket (or select one of its)
  if (metricAgg.type.name !== METRIC_TYPES.COUNT) {
    bucketAgg.subAggs = (output.subAggs || []).concat(metricAgg);
    output.params.buckets_path = `${bucketAgg.id}>${metricAgg.id}`;
  } else {
    output.params.buckets_path = bucketAgg.id + '>_count';
  }

  output.parentAggs = (output.parentAggs || []).concat(bucketAgg);
};
