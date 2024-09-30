/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { aggBucketSumFnName } from './bucket_sum_fn';
import { MetricAggType } from './metric_agg_type';
import { makeNestedLabel } from './lib/make_nested_label';
import { siblingPipelineAggHelper } from './lib/sibling_pipeline_agg_helper';
import { METRIC_TYPES } from './metric_agg_types';
import { AggConfigSerialized, BaseAggParams, IAggConfig } from '../types';

export interface AggParamsBucketSumSerialized extends BaseAggParams {
  customMetric?: AggConfigSerialized;
  customBucket?: AggConfigSerialized;
}

export interface AggParamsBucketSum extends BaseAggParams {
  customMetric?: IAggConfig;
  customBucket?: IAggConfig;
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
