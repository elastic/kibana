/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { aggBucketMaxFnName } from './bucket_max_fn';
import { MetricAggType } from './metric_agg_type';
import { makeNestedLabel } from './lib/make_nested_label';
import { siblingPipelineAggHelper } from './lib/sibling_pipeline_agg_helper';
import { METRIC_TYPES } from './metric_agg_types';
import { AggConfigSerialized, BaseAggParams, IAggConfig } from '../types';

export interface AggParamsBucketMaxSerialized extends BaseAggParams {
  customMetric?: AggConfigSerialized;
  customBucket?: AggConfigSerialized;
}

export interface AggParamsBucketMax extends BaseAggParams {
  customMetric?: IAggConfig;
  customBucket?: IAggConfig;
}

const overallMaxLabel = i18n.translate('data.search.aggs.metrics.overallMaxLabel', {
  defaultMessage: 'overall max',
});

const maxBucketTitle = i18n.translate('data.search.aggs.metrics.maxBucketTitle', {
  defaultMessage: 'Max Bucket',
});

export const getBucketMaxMetricAgg = () => {
  const { subtype, params, getSerializedFormat } = siblingPipelineAggHelper;

  return new MetricAggType({
    name: METRIC_TYPES.MAX_BUCKET,
    expressionName: aggBucketMaxFnName,
    title: maxBucketTitle,
    makeLabel: (agg) => makeNestedLabel(agg, overallMaxLabel),
    subtype,
    params: [...params()],
    getSerializedFormat,
  });
};
