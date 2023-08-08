/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { FormulaPublicApi, PersistedIndexPatternLayer } from '@kbn/lens-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { FormulaConfig, ChartColumn } from '../../../types';

export class FormulaColumn implements ChartColumn {
  constructor(private formulaConfig: FormulaConfig, private formulaAPI: FormulaPublicApi) {}

  getFormulaConfig(): FormulaConfig {
    return this.formulaConfig;
  }

  getData(
    id: string,
    baseLayer: PersistedIndexPatternLayer,
    dataView: DataView
  ): PersistedIndexPatternLayer {
    const { value, ...rest } = this.getFormulaConfig();
    const formulaLayer = this.formulaAPI.insertOrReplaceFormulaColumn(
      id,
      { formula: value, ...rest },
      baseLayer,
      dataView
    );

    if (!formulaLayer) {
      throw new Error('Error generating the data layer for the chart');
    }

    return formulaLayer;
  }
}
