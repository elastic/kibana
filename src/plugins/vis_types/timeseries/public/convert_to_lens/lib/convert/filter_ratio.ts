/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getFilterRatioFormula } from '../metrics';
import { createFormulaColumn } from './formula';
import { CommonColumnsConverterArgs, FormulaColumn } from './types';

export const convertFilterRatioToFormulaColumn = (
  { series, metrics, dataView }: CommonColumnsConverterArgs,
  reducedTimeRange?: string
): FormulaColumn | null => {
  const metric = metrics[metrics.length - 1];
  const formula = getFilterRatioFormula(metric, {
    reducedTimeRange,
    timeShift: series.offset_time,
  });

  if (!formula) {
    return null;
  }

  return createFormulaColumn(formula, { series, metric, dataView });
};
