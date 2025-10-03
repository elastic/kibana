/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PersistedIndexPatternLayer } from '@kbn/lens-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { FormulaValueConfig, ChartColumn } from '../../../types';
import { getFormulaColumn } from '../../../../config_builder/columns/formula';

export class FormulaColumn implements ChartColumn {
  constructor(private valueConfig: FormulaValueConfig) {}

  getValueConfig(): FormulaValueConfig {
    return this.valueConfig;
  }

  getData(
    id: string,
    baseLayer: PersistedIndexPatternLayer,
    dataView: DataView
  ): PersistedIndexPatternLayer {
    const { value, ...column } = this.getValueConfig();
    return getFormulaColumn(id, { formula: value, ...column }, dataView, baseLayer);
  }
}
