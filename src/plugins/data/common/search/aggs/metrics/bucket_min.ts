/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { aggBucketMinFnName } from './bucket_min_fn';
import { MetricAggType } from './metric_agg_type';
import { makeNestedLabel } from './lib/make_nested_label';
import { siblingPipelineAggHelper } from './lib/sibling_pipeline_agg_helper';
import { METRIC_TYPES } from './metric_agg_types';
import { AggConfigSerialized, BaseAggParams } from '../types';

export interface AggParamsBucketMin extends BaseAggParams {
  customMetric?: AggConfigSerialized;
  customBucket?: AggConfigSerialized;
}

const overallMinLabel = i18n.translate('data.search.aggs.metrics.overallMinLabel', {
  defaultMessage: 'overall min',
});

const minBucketTitle = i18n.translate('data.search.aggs.metrics.minBucketTitle', {
  defaultMessage: 'Min Bucket',
});

export const getBucketMinMetricAgg = () => {
  const { subtype, params, getSerializedFormat } = siblingPipelineAggHelper;

  return new MetricAggType({
    name: METRIC_TYPES.MIN_BUCKET,
    expressionName: aggBucketMinFnName,
    title: minBucketTitle,
    makeLabel: (agg) => makeNestedLabel(agg, overallMinLabel),
    subtype,
    params: [...params()],
    getSerializedFormat,
  });
};
