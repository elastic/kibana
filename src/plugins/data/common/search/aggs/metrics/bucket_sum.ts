/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { aggBucketSumFnName } from './bucket_sum_fn';
import { MetricAggType } from './metric_agg_type';
import { makeNestedLabel } from './lib/make_nested_label';
import { siblingPipelineAggHelper } from './lib/sibling_pipeline_agg_helper';
import { METRIC_TYPES } from './metric_agg_types';
import { AggConfigSerialized, BaseAggParams } from '../types';

export interface AggParamsBucketSum extends BaseAggParams {
  customMetric?: AggConfigSerialized;
  customBucket?: AggConfigSerialized;
}

const overallSumLabel = i18n.translate('data.search.aggs.metrics.overallSumLabel', {
  defaultMessage: 'overall sum',
});

const sumBucketTitle = i18n.translate('data.search.aggs.metrics.sumBucketTitle', {
  defaultMessage: 'Sum Bucket',
});

export const getBucketSumMetricAgg = () => {
  const { subtype, params, getSerializedFormat } = siblingPipelineAggHelper;

  return new MetricAggType({
    name: METRIC_TYPES.SUM_BUCKET,
    expressionName: aggBucketSumFnName,
    title: sumBucketTitle,
    makeLabel: (agg) => makeNestedLabel(agg, overallSumLabel),
    subtype,
    params: [...params()],
    getSerializedFormat,
  });
};
