/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { METRIC_TYPES } from '@kbn/data-plugin/common';
import { SchemaConfig } from '../../..';
import { FormulaColumn } from '../../types';
import { createFormulaColumn } from '../convert/formula';
import { getFormulaForAgg } from './formula';

export const getPercentageColumnFormulaColumn = (agg: SchemaConfig): FormulaColumn | null => {
  const metricFormula = getFormulaForAgg(agg as SchemaConfig<METRIC_TYPES>);
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
    label: `${formulaColumn?.label} percentages`,
  };
};
