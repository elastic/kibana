/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FormulaColumn } from '../../types';
import { getFormulaForPipelineAgg } from '../metrics/formula';
import { createFormulaColumn } from './formula';
import { CommonColumnConverterArgs, SiblingPipelineMetric } from './types';

export const convertToSiblingPipelineColumns = (
  columnConverterArgs: CommonColumnConverterArgs<SiblingPipelineMetric>,
  reducedTimeRange?: string
): FormulaColumn | null => {
  const { aggParams } = columnConverterArgs.agg;
  if (!aggParams) {
    return null;
  }

  if (!aggParams.customMetric) {
    return null;
  }

  const formula = getFormulaForPipelineAgg(columnConverterArgs.agg, reducedTimeRange);
  if (!formula) {
    return null;
  }

  const formulaColumn = createFormulaColumn(formula, columnConverterArgs.agg);
  if (!formulaColumn) {
    return null;
  }

  return formulaColumn;
};
