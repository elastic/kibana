/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { FormulaPublicApi, PersistedIndexPatternLayer } from '@kbn/lens-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';

type LensFormula = Parameters<FormulaPublicApi['insertOrReplaceFormulaColumn']>[1];

export type FormulaValueConfig = Omit<LensFormula, 'formula'> & {
  color?: string;
  value: string;
};
export function getFormulaColumn(
  id: string,
  config: FormulaValueConfig,
  dataView: DataView,
  formulaAPI: FormulaPublicApi,
  baseLayer?: PersistedIndexPatternLayer
): PersistedIndexPatternLayer {
  const { value, ...rest } = config;
  const formulaLayer = formulaAPI.insertOrReplaceFormulaColumn(
    id,
    { formula: value, ...rest },
    baseLayer || { columnOrder: [], columns: {} },
    dataView
  );

  if (!formulaLayer) {
    throw new Error('Error generating the data layer for the chart');
  }

  return formulaLayer;
}
