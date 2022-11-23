/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { METRIC_TYPES } from '@kbn/data-plugin/common';
import { createFormulaColumn, ExtendedColumnConverterArgs, FormulaColumn } from '../convert';
import { getFormulaForAgg } from './formula';

export const getPercentageColumnFormulaColumn = ({
  agg,
  aggs,
  dataView,
  visType,
}: ExtendedColumnConverterArgs<METRIC_TYPES>): FormulaColumn | null => {
  const metricFormula = getFormulaForAgg({ agg, aggs, dataView, visType });
  if (!metricFormula) {
    return null;
  }
  const formula = `(${metricFormula}) / overall_sum(${metricFormula})`;

  const formulaColumn = createFormulaColumn(formula, agg);

  if (!formulaColumn) {
    return null;
  }

  return {
    ...formulaColumn,
    params: {
      ...formulaColumn.params,
      format: { id: 'percent' },
    },
    label: `${formulaColumn?.label} percentages`,
  };
};
