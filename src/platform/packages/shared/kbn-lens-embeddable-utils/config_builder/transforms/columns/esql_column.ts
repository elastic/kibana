/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TextBasedLayer, TextBasedLayerColumn } from '@kbn/lens-common';
import type { DatatableColumnType } from '@kbn/expressions-plugin/common';

export const getValueColumn = (
  id: string,
  apiColumn: { column: string; label?: string },
  fieldType: DatatableColumnType = 'string',
  inMetricDimension?: boolean
): TextBasedLayerColumn => {
  return {
    columnId: id,
    fieldName: apiColumn.column || id,
    ...(fieldType ? { meta: { type: fieldType } } : {}),
    ...(apiColumn.label != null ? { label: apiColumn.label, customLabel: true } : {}),
    ...(inMetricDimension != null ? { inMetricDimension } : {}),
  };
};

export const getValueApiColumn = (accessor: string, layer: TextBasedLayer) => {
  const col = layer.columns.find((c) => c.columnId === accessor)!;
  return {
    operation: 'value' as const,
    column: col.fieldName,
    ...(col.customLabel && col.label != null ? { label: col.label } : {}),
  };
};
