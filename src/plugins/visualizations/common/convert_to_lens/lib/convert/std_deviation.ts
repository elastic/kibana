/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { METRIC_TYPES } from '@kbn/data-plugin/common';
import { addTimeRangeToFormula } from '../metrics/formula';
import { getFieldNameFromField } from '../utils';
import { createFormulaColumn } from './formula';
import { getFormulaFromMetric, SUPPORTED_METRICS } from './supported_metrics';
import { CommonColumnConverterArgs } from './types';

const getFormulaForStdDevLowerBound = (field: string, reducedTimeRange?: string) => {
  const aggFormula = getFormulaFromMetric(SUPPORTED_METRICS.std_dev);

  return `average(${field}${addTimeRangeToFormula(
    reducedTimeRange
  )}) - ${2} * ${aggFormula}(${field}${addTimeRangeToFormula(reducedTimeRange)})`;
};

const getFormulaForStdDevUpperBound = (field: string, reducedTimeRange?: string) => {
  const aggFormula = getFormulaFromMetric(SUPPORTED_METRICS.std_dev);

  return `average(${field}${addTimeRangeToFormula(
    reducedTimeRange
  )}) + ${2} * ${aggFormula}(${field}${addTimeRangeToFormula(reducedTimeRange)})`;
};

export const convertToStdDeviationFormulaColumns = (
  { agg, dataView }: CommonColumnConverterArgs<METRIC_TYPES.STD_DEV>,
  reducedTimeRange?: string
) => {
  const fieldName = getFieldNameFromField(agg.aggParams?.field);

  if (!fieldName) {
    return null;
  }
  const field = dataView.getFieldByName(fieldName);
  if (!field) {
    return null;
  }

  const { accessor } = agg;
  const formula =
    accessor % 2 === 0 // every even accessor is lower bound, odd is upper bound
      ? getFormulaForStdDevLowerBound(field.displayName, reducedTimeRange)
      : getFormulaForStdDevUpperBound(field.displayName, reducedTimeRange);

  return createFormulaColumn(formula, agg);
};
