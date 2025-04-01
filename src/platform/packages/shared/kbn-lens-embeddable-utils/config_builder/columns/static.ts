/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PersistedIndexPatternLayer, FormulaPublicApi } from '@kbn/lens-plugin/public';
import type { ReferenceBasedIndexPatternColumn } from '@kbn/lens-plugin/public/datasources/form_based/operations/definitions/column_types';

export type LensFormula = Parameters<FormulaPublicApi['insertOrReplaceFormulaColumn']>[1];

export type StaticValueConfig = Omit<LensFormula, 'formula'> & {
  color?: string;
  value: string;
};
export function getStaticColumn(
  id: string,
  baseLayer: PersistedIndexPatternLayer,
  config: StaticValueConfig
): PersistedIndexPatternLayer {
  const { label, ...params } = config;
  return {
    linkToLayers: [],
    columnOrder: [...baseLayer.columnOrder, id],
    columns: {
      [id]: {
        label: label ?? 'Reference',
        dataType: 'number',
        operationType: 'static_value',
        isStaticValue: true,
        isBucketed: false,
        scale: 'ratio',
        params,
        references: [],
        customLabel: true,
      } as ReferenceBasedIndexPatternColumn,
    },
    sampling: 1,
    incompleteColumns: {},
  };
}
