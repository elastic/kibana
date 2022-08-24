/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Metric, Series } from '../../../../common/types';
import { getFilterRatioFormula } from '../metrics';
import { createFormulaColumn } from './formula';
import { FormulaColumn } from './types';

export const convertFilterRatioToFormulaColumn = (
  series: Series,
  metrics: Metric[],
  window?: string
): FormulaColumn | null => {
  const currentMetric = metrics[metrics.length - 1];

  const formula = getFilterRatioFormula(currentMetric, window);

  if (!formula) {
    return null;
  }

  return createFormulaColumn(formula, series, currentMetric);
};
