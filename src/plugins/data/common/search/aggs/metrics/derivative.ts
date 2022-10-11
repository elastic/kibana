/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { aggDerivativeFnName } from './derivative_fn';
import { MetricAggType } from './metric_agg_type';
import { parentPipelineAggHelper } from './lib/parent_pipeline_agg_helper';
import { makeNestedLabel } from './lib/make_nested_label';
import { METRIC_TYPES } from './metric_agg_types';
import { AggConfigSerialized, BaseAggParams, IAggConfig } from '../types';

export interface CommonAggParamsDerivative extends BaseAggParams {
  buckets_path?: string;
  metricAgg?: string;
}

export interface AggParamsDerivativeSerialized extends CommonAggParamsDerivative {
  customMetric?: AggConfigSerialized;
}

export interface AggParamsDerivative extends CommonAggParamsDerivative {
  customMetric?: IAggConfig;
}

const derivativeLabel = i18n.translate('data.search.aggs.metrics.derivativeLabel', {
  defaultMessage: 'derivative',
});

const derivativeTitle = i18n.translate('data.search.aggs.metrics.derivativeTitle', {
  defaultMessage: 'Derivative',
});

export const getDerivativeMetricAgg = () => {
  const { subtype, params, getSerializedFormat } = parentPipelineAggHelper;

  return new MetricAggType({
    name: METRIC_TYPES.DERIVATIVE,
    expressionName: aggDerivativeFnName,
    title: derivativeTitle,
    makeLabel(agg) {
      return makeNestedLabel(agg, derivativeLabel);
    },
    subtype,
    params: [...params()],
    getSerializedFormat,
  });
};
