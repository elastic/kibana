/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DataView } from '@kbn/data-views-plugin/common';
import type { Metric, Series } from '../../../../common/types';
import { buildCounterRateFormula } from '../metrics';
import { createFormulaColumn } from './formula';
import { FormulaColumn } from './types';

export const convertToCounterRateFormulaColumn = (
  series: Series,
  metrics: Metric[],
  dataView: DataView
): FormulaColumn | null => {
  const currentMetric = metrics[metrics.length - 1];

  const field = currentMetric.field ? dataView.getFieldByName(currentMetric.field) : undefined;
  if (!field) {
    return null;
  }

  const formula = buildCounterRateFormula(currentMetric, field);
  return createFormulaColumn(formula, series, currentMetric);
};
