/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { MetricAggType } from './metric_agg_type';
import { makeNestedLabel } from './lib/make_nested_label';
import { siblingPipelineAggHelper } from './lib/sibling_pipeline_agg_helper';
import { METRIC_TYPES } from './metric_agg_types';
import { AggConfigSerialized, BaseAggParams } from '../types';
import { aggFilteredMetricFnName } from './filtered_metric_fn';

export interface AggParamsFilteredMetric extends BaseAggParams {
  customMetric?: AggConfigSerialized;
  customBucket?: AggConfigSerialized;
}

const filteredMetricLabel = i18n.translate('data.search.aggs.metrics.filteredMetricLabel', {
  defaultMessage: 'filtered',
});

const filteredMetricTitle = i18n.translate('data.search.aggs.metrics.filteredMetricTitle', {
  defaultMessage: 'Filtered metric',
});

export const getFilteredMetricAgg = () => {
  const { subtype, params, getSerializedFormat } = siblingPipelineAggHelper;

  return new MetricAggType({
    name: METRIC_TYPES.FILTERED_METRIC,
    expressionName: aggFilteredMetricFnName,
    title: filteredMetricTitle,
    makeLabel: (agg) => makeNestedLabel(agg, filteredMetricLabel),
    subtype,
    params: [...params(['filter'])],
    hasNoDslParams: true,
    getSerializedFormat,
    getValue(agg, bucket) {
      const customMetric = agg.getParam('customMetric');
      const customBucket = agg.getParam('customBucket');
      return bucket && bucket[customBucket.id] && customMetric.getValue(bucket[customBucket.id]);
    },
    getValueBucketPath(agg) {
      const customBucket = agg.getParam('customBucket');
      const customMetric = agg.getParam('customMetric');
      if (customMetric.type.name === 'count') {
        return customBucket.getValueBucketPath();
      }
      return `${customBucket.getValueBucketPath()}>${customMetric.getValueBucketPath()}`;
    },
    getResponseId(agg) {
      return agg.params.customBucket.id;
    },
  });
};
