/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { buildCounterRateFormula } from '../metrics';
import { createFormulaColumn } from './formula';
import { CommonColumnsConverterArgs, FormulaColumn } from './types';

export const convertToCounterRateFormulaColumn = ({
  series,
  metrics,
  dataView,
}: CommonColumnsConverterArgs): FormulaColumn | null => {
  const metric = metrics[metrics.length - 1];

  const field = metric.field ? dataView.getFieldByName(metric.field) : undefined;
  if (!field) {
    return null;
  }

  const formula = buildCounterRateFormula(metric, field);
  return createFormulaColumn(formula, { series, metric, dataView });
};
