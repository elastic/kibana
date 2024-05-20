/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { MetricAggType } from './metric_agg_type';
import { aggSerialDiffFnName } from './serial_diff_fn';
import { parentPipelineAggHelper } from './lib/parent_pipeline_agg_helper';
import { makeNestedLabel } from './lib/make_nested_label';
import { METRIC_TYPES } from './metric_agg_types';
import { AggConfigSerialized, BaseAggParams, IAggConfig } from '../types';

export interface CommonAggParamsSerialDiff extends BaseAggParams {
  buckets_path?: string;
  metricAgg?: string;
}

export interface AggParamsSerialDiffSerialized extends CommonAggParamsSerialDiff {
  customMetric?: AggConfigSerialized;
}

export interface AggParamsSerialDiff extends CommonAggParamsSerialDiff {
  customMetric?: IAggConfig;
}

const serialDiffTitle = i18n.translate('data.search.aggs.metrics.serialDiffTitle', {
  defaultMessage: 'Serial Diff',
});

const serialDiffLabel = i18n.translate('data.search.aggs.metrics.serialDiffLabel', {
  defaultMessage: 'serial diff',
});

export const getSerialDiffMetricAgg = () => {
  const { subtype, params, getSerializedFormat } = parentPipelineAggHelper;

  return new MetricAggType({
    name: METRIC_TYPES.SERIAL_DIFF,
    expressionName: aggSerialDiffFnName,
    title: serialDiffTitle,
    makeLabel: (agg) => makeNestedLabel(agg, serialDiffLabel),
    subtype,
    params: [...params()],
    getSerializedFormat,
  });
};
