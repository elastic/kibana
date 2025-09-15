/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  PersistedIndexPatternLayer,
  FormulaIndexPatternColumn,
} from '@kbn/lens-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { FormulaValueConfig, ChartColumn } from '../../../types';

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
    const { format, value, ...column } = this.getValueConfig();
    const formulaColumn = {
      operationType: 'formula',
      isBucketed: false,
      dataType: 'number',
      references: [],
      label: value,
      ...column,
      params: { formula: value, format },
    } satisfies FormulaIndexPatternColumn;

    const formulaLayer = {
      ...baseLayer,
      columnOrder: baseLayer.columnOrder.concat(id),
      columns: {
        ...baseLayer.columns,
        [id]: {
          ...formulaColumn,
          customLabel: formulaColumn.label != null && formulaColumn.label !== value,
        },
      },
      indexPatternId: dataView.id!,
    };

    if (!formulaLayer) {
      throw new Error('Error generating the data layer for the chart');
    }

    return formulaLayer;
  }
}
