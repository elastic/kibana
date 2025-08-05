/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FormulaIndexPatternColumn } from '@kbn/lens-plugin/public';
import { FormulaValueConfig } from '../types';
import { LensApiFormulaOperation } from '../schema/metric_ops';

export function getFormulaColumn(config: LensApiFormulaOperation): FormulaIndexPatternColumn {
  const { formula } = config;

  return {
    label: formula,
    dataType: 'number',
    operationType: 'formula',
    scale: 'ordinal',
    isBucketed: true,
    params: {
      formula,
    },
    references: [],
  };
}

export function fromFormulaColumn(column: FormulaIndexPatternColumn): LensApiFormulaOperation {
  const { label, params } = column;

  return {
    label,
    formula: params?.formula || '',
    operation: 'formula',
  };
}
