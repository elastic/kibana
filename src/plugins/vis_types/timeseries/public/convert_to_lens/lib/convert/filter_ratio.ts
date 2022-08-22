/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { TSVB_METRIC_TYPES } from '../../../../common/enums';
import type { Metric, Series } from '../../../../common/types';
import { getSiblingPipelineSeriesFormula } from '../metrics';
import { createFormulaColumn } from './formula';
import { FormulaColumn } from './types';

export const convertFilterRatioToFormulaColumn = (
  series: Series,
  metrics: Metric[]
): FormulaColumn | null => {
  const currentMetric = metrics[metrics.length - 1];

  const formula = getSiblingPipelineSeriesFormula(
    TSVB_METRIC_TYPES.FILTER_RATIO,
    currentMetric,
    metrics
  );

  if (!formula) {
    return null;
  }

  return createFormulaColumn(formula, series, currentMetric);
};
