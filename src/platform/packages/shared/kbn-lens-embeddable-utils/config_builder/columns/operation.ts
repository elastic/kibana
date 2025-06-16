/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FieldBasedIndexPatternColumn, FormulaPublicApi, PersistedIndexPatternLayer } from '@kbn/lens-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import { LensOperation } from '../operation_types';
import { FormattedIndexPatternColumn } from '@kbn/lens-plugin/public/datasources/form_based/operations/definitions/column_types';

export function getOperationColumn(
  id: string,
  config: LensOperation,
  dataView: DataView,
  formulaAPI?: FormulaPublicApi,
  baseLayer?: PersistedIndexPatternLayer
): PersistedIndexPatternLayer {
  const layer = baseLayer || { columnOrder: [], columns: {} } as PersistedIndexPatternLayer;
  layer.columns[id] = {
    dataType: 'number',
    operationType: config.type,
    sourceField: 'field' in config ? config.field : undefined,
    label: config.label || '',
    timeScale: config.timeScale,
    scale: config.scale || 'ratio',
    filter: config.filter ? { query: config.filter } : undefined,
    customLabel: Boolean(config.label),
    params: {
      format: config.format,
      value: 'value' in config ? config.value : undefined,
    } as any,
    isStaticValue: Boolean('value' in config && config.value),
    isBucketed: false,
  } as FieldBasedIndexPatternColumn & FormattedIndexPatternColumn;
  layer.columnOrder.push(id);

  return layer;
}

export function fromOperationColumn(
  layer: PersistedIndexPatternLayer,
  columnId: string
): LensOperation {
  const column = layer.columns[columnId] as FieldBasedIndexPatternColumn;
  if (!column || column.operationType === 'formula') {
    throw new Error(`Column with id ${columnId} is a formula column`);
  }

  const { label, params } = column as FormattedIndexPatternColumn;

  return {
    type: column.operationType as any,
    field: column.sourceField,
    label,
    timeScale: column.timeScale,
    scale: column.scale || 'ratio',
    filter: column.filter?.query as string,
    format: params?.format,
    value: params?.value,
  };
}
