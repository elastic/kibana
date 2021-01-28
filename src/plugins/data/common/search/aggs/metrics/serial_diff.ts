/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { MetricAggType } from './metric_agg_type';
import { aggSerialDiffFnName } from './serial_diff_fn';
import { parentPipelineAggHelper } from './lib/parent_pipeline_agg_helper';
import { makeNestedLabel } from './lib/make_nested_label';
import { METRIC_TYPES } from './metric_agg_types';
import { AggConfigSerialized, BaseAggParams } from '../types';

export interface AggParamsSerialDiff extends BaseAggParams {
  buckets_path?: string;
  customMetric?: AggConfigSerialized;
  metricAgg?: string;
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
