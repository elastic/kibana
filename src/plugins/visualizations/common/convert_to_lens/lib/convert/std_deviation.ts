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

const STD_LOWER = 'std_lower';
const STD_UPPER = 'std_upper';
const STD_MODES = [STD_LOWER, STD_UPPER];

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
  const { aggId } = agg;
  if (!aggId) {
    return null;
  }

  const fieldName = getFieldNameFromField(agg.aggParams?.field);

  if (!fieldName) {
    return null;
  }
  const field = dataView.getFieldByName(fieldName);
  if (!field) {
    return null;
  }

  const [, mode] = aggId.split('.');
  if (!STD_MODES.includes(mode)) {
    return null;
  }

  const formula =
    mode === STD_LOWER
      ? getFormulaForStdDevLowerBound(field.displayName, reducedTimeRange)
      : getFormulaForStdDevUpperBound(field.displayName, reducedTimeRange);

  return createFormulaColumn(formula, agg);
};
