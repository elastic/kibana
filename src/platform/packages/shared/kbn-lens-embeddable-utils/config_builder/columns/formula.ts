/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PersistedIndexPatternLayer, FormulaIndexPatternColumn } from '@kbn/lens-common';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { FormulaValueConfig } from '../types';

export function getFormulaColumn(
  id: string,
  config: FormulaValueConfig,
  dataView: DataView,
  baseLayer?: PersistedIndexPatternLayer
) {
  const { format, label, formula, ...column } = config;
  const formulaColumn = {
    operationType: 'formula',
    isBucketed: false,
    dataType: 'number',
    references: [],
    label: label ?? formula,
    ...column,
    params: { formula, format },
  } satisfies FormulaIndexPatternColumn;

  const formulaLayer = {
    ...baseLayer,
    columnOrder: (baseLayer?.columnOrder ?? []).concat(id),
    columns: {
      ...(baseLayer?.columns ?? {}),
      [id]: {
        ...formulaColumn,
        customLabel: true,
      },
    },
  };

  if (!formulaLayer) {
    throw new Error('Error generating the data layer for the chart');
  }
  return formulaLayer;
}
