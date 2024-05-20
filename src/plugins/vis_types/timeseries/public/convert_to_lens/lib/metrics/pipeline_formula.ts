/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { TSVB_METRIC_TYPES } from '../../../../common/enums';
import type { Metric } from '../../../../common/types';
import { getFormulaFromMetric, SUPPORTED_METRICS } from './supported_metrics';
import { getFormulaEquivalent, getTimeScale } from './metrics_helpers';

const getAdditionalArgs = (metric: Metric) => {
  if (metric.type === TSVB_METRIC_TYPES.POSITIVE_ONLY) {
    return `, 0`;
  }

  if (metric.type === TSVB_METRIC_TYPES.MOVING_AVERAGE) {
    return `, window=${metric.window || 5}`;
  }

  return '';
};

export const getPipelineSeriesFormula = (
  metric: Metric,
  metrics: Metric[],
  subFunctionMetric: Metric,
  {
    metaValue,
    reducedTimeRange,
    timeShift,
  }: { metaValue?: number; reducedTimeRange?: string; timeShift?: string } = {}
) => {
  const aggregationMap = SUPPORTED_METRICS[metric.type];
  if (!aggregationMap) {
    return null;
  }
  if (!subFunctionMetric || subFunctionMetric.type === 'static') {
    return null;
  }

  const aggFormula = getFormulaFromMetric(aggregationMap);

  const subFormula = getFormulaEquivalent(subFunctionMetric, metrics, {
    metaValue,
    reducedTimeRange,
    timeShift,
  });

  if (!subFormula) {
    return null;
  }
  const additionalArgs = getAdditionalArgs(metric);

  const formula = `${aggFormula}(${subFormula}${additionalArgs})`;
  return metric.unit ? `normalize_by_unit(${formula}, unit='${getTimeScale(metric)}')` : formula;
};
