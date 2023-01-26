/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { aggCumulativeSumFnName } from './cumulative_sum_fn';
import { MetricAggType } from './metric_agg_type';
import { parentPipelineAggHelper } from './lib/parent_pipeline_agg_helper';
import { makeNestedLabel } from './lib/make_nested_label';
import { METRIC_TYPES } from './metric_agg_types';
import { AggConfigSerialized, BaseAggParams, IAggConfig } from '../types';

export interface CommonAggParamsCumulativeSum extends BaseAggParams {
  buckets_path?: string;
  metricAgg?: string;
}

export interface AggParamsCumulativeSumSerialized extends CommonAggParamsCumulativeSum {
  customMetric?: AggConfigSerialized;
}

export interface AggParamsCumulativeSum extends CommonAggParamsCumulativeSum {
  customMetric?: IAggConfig;
}

const cumulativeSumLabel = i18n.translate('data.search.aggs.metrics.cumulativeSumLabel', {
  defaultMessage: 'cumulative sum',
});

const cumulativeSumTitle = i18n.translate('data.search.aggs.metrics.cumulativeSumTitle', {
  defaultMessage: 'Cumulative Sum',
});

export const getCumulativeSumMetricAgg = () => {
  const { subtype, params, getSerializedFormat } = parentPipelineAggHelper;

  return new MetricAggType({
    name: METRIC_TYPES.CUMULATIVE_SUM,
    expressionName: aggCumulativeSumFnName,
    title: cumulativeSumTitle,
    makeLabel: (agg) => makeNestedLabel(agg, cumulativeSumLabel),
    subtype,
    params: [...params()],
    getSerializedFormat,
  });
};
