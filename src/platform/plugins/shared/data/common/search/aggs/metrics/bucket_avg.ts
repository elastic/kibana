/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { get } from 'lodash';
import { aggBucketAvgFnName } from './bucket_avg_fn';
import { MetricAggType } from './metric_agg_type';
import { makeNestedLabel } from './lib/make_nested_label';
import { siblingPipelineAggHelper } from './lib/sibling_pipeline_agg_helper';
import { METRIC_TYPES } from './metric_agg_types';
import { AggConfigSerialized, BaseAggParams, IAggConfig } from '../types';

export interface AggParamsBucketAvgSerialized extends BaseAggParams {
  customMetric?: AggConfigSerialized;
  customBucket?: AggConfigSerialized;
}

export interface AggParamsBucketAvg extends BaseAggParams {
  customMetric?: IAggConfig;
  customBucket?: IAggConfig;
}

const overallAverageLabel = i18n.translate('data.search.aggs.metrics.overallAverageLabel', {
  defaultMessage: 'overall average',
});

const averageBucketTitle = i18n.translate('data.search.aggs.metrics.averageBucketTitle', {
  defaultMessage: 'Average Bucket',
});

export const getBucketAvgMetricAgg = () => {
  const { subtype, params, getSerializedFormat } = siblingPipelineAggHelper;

  return new MetricAggType({
    name: METRIC_TYPES.AVG_BUCKET,
    expressionName: aggBucketAvgFnName,
    title: averageBucketTitle,
    makeLabel: (agg) => makeNestedLabel(agg, overallAverageLabel),
    subtype,
    params: [...params()],
    getSerializedFormat,
    getValue(agg, bucket) {
      const customMetric = agg.getParam('customMetric');
      const customBucket = agg.getParam('customBucket');
      const scaleMetrics = customMetric.type && customMetric.type.isScalable();

      let value = bucket[agg.id] && bucket[agg.id].value;

      if (scaleMetrics && customBucket.type.name === 'date_histogram') {
        const aggInfo = customBucket.write();

        value *= get(aggInfo, 'bucketInterval.scale', 1);
      }
      return value;
    },
  });
};
