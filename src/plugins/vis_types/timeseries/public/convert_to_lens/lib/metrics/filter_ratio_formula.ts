/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Query } from '@kbn/es-query';
import type { Metric, MetricType } from '../../../../common/types';
import { getFormulaFromMetric, SupportedMetric, SUPPORTED_METRICS } from './supported_metrics';
import { addAdditionalArgs } from '.';
import { AdditionalArgs } from '../../types';

const escapeQuotes = (str: string) => {
  return str?.replace(/'/g, "\\'");
};

const constructFilterRationFormula = (
  operation: string,
  metric?: Query,
  additionalArgs?: AdditionalArgs
) => {
  return `${operation}${metric?.language === 'lucene' ? 'lucene' : 'kql'}='${
    metric?.query && typeof metric?.query === 'string'
      ? escapeQuotes(metric?.query)
      : metric?.query ?? '*'
  }'${additionalArgs ? addAdditionalArgs(additionalArgs) : ''})`;
};

export const getFilterRatioFormula = (currentMetric: Metric, additionalArgs: AdditionalArgs) => {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const { numerator, denominator, metric_agg, field } = currentMetric;
  let aggregation: SupportedMetric | null | undefined = SUPPORTED_METRICS.count;
  if (metric_agg) {
    aggregation = SUPPORTED_METRICS[metric_agg as MetricType];
    if (!aggregation) {
      return null;
    }
  }
  const aggFormula = getFormulaFromMetric(aggregation);

  const operation = metric_agg && metric_agg !== 'count' ? `${aggFormula}('${field}',` : 'count(';

  if (aggregation.name === 'counter_rate') {
    const numeratorFormula = `counter_rate(${constructFilterRationFormula(
      `(max('${field}',`,
      numerator,
      additionalArgs
    )})`;
    const denominatorFormula = `counter_rate(${constructFilterRationFormula(
      `(max('${field}',`,
      denominator,
      additionalArgs
    )})`;
    return `${numeratorFormula}) / ${denominatorFormula})`;
  } else {
    const numeratorFormula = constructFilterRationFormula(operation, numerator, additionalArgs);
    const denominatorFormula = constructFilterRationFormula(operation, denominator, additionalArgs);
    return `${numeratorFormula} / ${denominatorFormula}`;
  }
};
