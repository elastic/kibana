/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { aggBucketAvgFnName } from './bucket_avg_fn';
import { MetricAggType } from './metric_agg_type';
import { makeNestedLabel } from './lib/make_nested_label';
import { siblingPipelineAggHelper } from './lib/sibling_pipeline_agg_helper';
import { METRIC_TYPES } from './metric_agg_types';
import { AggConfigSerialized, BaseAggParams } from '../types';

export interface AggParamsBucketAvg extends BaseAggParams {
  customMetric?: AggConfigSerialized;
  customBucket?: AggConfigSerialized;
}

const overallAverageLabel = i18n.translate('data.search.aggs.metrics.overallAverageLabel', {
  defaultMessage: 'filtered',
});

const averageBucketTitle = i18n.translate('data.search.aggs.metrics.averageBucketTitle', {
  defaultMessage: 'Filtered metric',
});

export const getBucketAvgMetricAgg = () => {
  const { subtype, params, getSerializedFormat } = siblingPipelineAggHelper;

  return new MetricAggType({
    name: METRIC_TYPES.FILTERED_METRIC,
    expressionName: aggBucketAvgFnName,
    title: averageBucketTitle,
    makeLabel: (agg) => makeNestedLabel(agg, overallAverageLabel),
    subtype,
    params: [...params(['filter'])],
    getSerializedFormat,
    hasNoDsl: true,
    getValue(agg, bucket) {
      // TODO read the id from the metric
      // const customMetric = agg.getParam('customMetric');
      // const customBucket = agg.getParam('customBucket');

      return bucket[agg.id + '-metric'] && bucket[agg.id + '-metric'].value;
    },
  });
};
