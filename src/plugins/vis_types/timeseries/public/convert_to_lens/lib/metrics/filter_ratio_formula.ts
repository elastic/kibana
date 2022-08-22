/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Query } from '@kbn/es-query';
import { addTimeRangeToFormula } from '.';
import type { Metric } from '../../../../common/types';
import { SUPPORTED_METRICS } from './supported_metrics';

const escapeQuotes = (str: string) => {
  return str?.replace(/'/g, "\\'");
};

const constructFilterRationFormula = (operation: string, metric?: Query, window?: string) => {
  return `${operation}${metric?.language === 'lucene' ? 'lucene' : 'kql'}='${
    metric?.query && typeof metric?.query === 'string'
      ? escapeQuotes(metric?.query)
      : metric?.query ?? '*'
  }'${addTimeRangeToFormula(window)})`;
};

export const getFilterRatioFormula = (currentMetric: Metric, window?: string) => {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const { numerator, denominator, metric_agg, field } = currentMetric;
  let aggregation = SUPPORTED_METRICS.count;
  if (metric_agg) {
    aggregation = SUPPORTED_METRICS[metric_agg];
    if (!aggregation) {
      return null;
    }
  }
  const operation =
    metric_agg && metric_agg !== 'count' ? `${aggregation.name}('${field}',` : 'count(';

  if (aggregation.name === 'counter_rate') {
    const numeratorFormula = constructFilterRationFormula(
      `${aggregation.name}(max('${field}',`,
      numerator,
      window
    );
    const denominatorFormula = constructFilterRationFormula(
      `${aggregation.name}(max('${field}',`,
      denominator,
      window
    );
    return `${numeratorFormula}) / ${denominatorFormula})`;
  } else {
    const numeratorFormula = constructFilterRationFormula(operation, numerator, window);
    const denominatorFormula = constructFilterRationFormula(operation, denominator, window);
    return `${numeratorFormula} / ${denominatorFormula}`;
  }
};
