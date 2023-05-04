/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SchemaConfig } from '../../..';
import { FormulaParams } from '../../types';
import { createAggregationId, createColumn, getFormat } from './column';
import { FormulaColumn } from './types';

const convertToFormulaParams = (formula: string): FormulaParams => ({
  formula,
});

export const createFormulaColumn = (formula: string, agg: SchemaConfig): FormulaColumn | null => {
  const params = convertToFormulaParams(formula);
  return {
    operationType: 'formula',
    ...createColumn(agg),
    references: [],
    dataType: 'number',
    params: { ...params, ...getFormat() },
    timeShift: agg.aggParams?.timeShift,
    meta: { aggId: createAggregationId(agg) },
  };
};
