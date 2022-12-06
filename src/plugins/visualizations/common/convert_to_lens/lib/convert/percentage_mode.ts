/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { METRIC_TYPES } from '@kbn/data-plugin/common';
import { MinMax } from '../../types';
import { getFormulaForAgg } from '../metrics/formula';
import { createFormulaColumn } from './formula';
import { ExtendedColumnConverterArgs } from './types';

const getPercentageFormulaOverRange = (formula: string, { min, max }: MinMax) =>
  `((${formula}) - ${min}) / (${max} - ${min})`;

// Lens is multiplying by 100, so, it is necessary to disable that operation.
const getPercentageFormula = (formula: string) => `(${formula}) / 10000`;

const isMinMax = (minMax: MinMax | {}): minMax is MinMax => {
  if ((minMax as MinMax).min !== undefined && (minMax as MinMax).max !== undefined) {
    return true;
  }
  return false;
};

export const convertToColumnInPercentageMode = (
  columnConverterArgs: ExtendedColumnConverterArgs<METRIC_TYPES>,
  minMax: MinMax | {}
) => {
  if (columnConverterArgs.agg.aggType === METRIC_TYPES.TOP_HITS) {
    return null;
  }

  const formula = getFormulaForAgg(columnConverterArgs);
  if (formula === null) {
    return null;
  }

  const percentageModeFormula = isMinMax(minMax)
    ? getPercentageFormulaOverRange(formula, minMax)
    : getPercentageFormula(formula);

  const column = createFormulaColumn(percentageModeFormula, columnConverterArgs.agg);
  if (column === null) {
    return null;
  }
  return {
    ...column,
    params: { ...column?.params, format: { id: 'percent' } },
  };
};
