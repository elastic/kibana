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
  fieldName?: string,
  fieldType: DatatableColumnType = 'string',
  inMetricDimension?: boolean
): TextBasedLayerColumn => {
  return {
    columnId: id,
    fieldName: fieldName || id,
    ...(fieldType ? { meta: { type: fieldType } } : {}),
    ...(inMetricDimension != null ? { inMetricDimension } : {}),
  };
};

export const getValueApiColumn = (accessor: string, layer: TextBasedLayer) => {
  return {
    operation: 'value' as const,
    column: layer.columns.find((c) => c.columnId === accessor)!.fieldName,
  };
};
