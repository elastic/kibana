/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { siblingPipelineType } from '../../../..';
import { IMetricAggConfig } from '../metric_agg_type';
import { METRIC_TYPES } from '../metric_agg_types';

export const siblingPipelineAggWriter = (agg: IMetricAggConfig, output: Record<string, any>) => {
  const metricAgg = agg.getParam('customMetric');
  const bucketAgg = agg.getParam('customBucket');
  if (!metricAgg) return;

  // if a bucket is selected, we must add this agg as a sibling to it, and add a metric to that bucket (or select one of its)
  if (metricAgg.type.name !== METRIC_TYPES.COUNT) {
    bucketAgg.subAggs = (output.subAggs || []).concat(metricAgg);
    output.params.buckets_path = `${bucketAgg.id}>${metricAgg.id}`;

    // If the metric is another nested sibling pipeline agg, we need to include it as a sub-agg of this agg's bucket agg
    if (metricAgg.type.subtype === siblingPipelineType) {
      const subAgg = metricAgg.getParam('customBucket');
      if (subAgg) bucketAgg.subAggs.push(subAgg);
    }
  } else {
    output.params.buckets_path = bucketAgg.id + '>_count';
  }

  output.parentAggs = (output.parentAggs || []).concat(bucketAgg);
};
