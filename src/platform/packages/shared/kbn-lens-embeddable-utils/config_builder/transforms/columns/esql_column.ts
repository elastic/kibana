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
import type { LensApiMetricOperation } from '../../schema/metric_ops';
import { fromFormatAPIToLensState, fromFormatLensStateToAPI } from './format';

interface ApiColumn {
  column: string;
  data_type?: string;
  label?: string;
  format?: LensApiMetricOperation['format'];
}

export const getValueColumn = (
  id: string,
  apiColumn: ApiColumn,
  inMetricDimension?: boolean
): TextBasedLayerColumn => {
  const fieldType = (apiColumn.data_type ?? 'string') as DatatableColumnType;
  const format = apiColumn.format ? fromFormatAPIToLensState(apiColumn.format) : undefined;
  const result = {
    columnId: id,
    fieldName: apiColumn.column || id,
    meta: { type: fieldType },
    ...(apiColumn.label != null ? { label: apiColumn.label, customLabel: true } : {}),
    ...(format ? { params: { format } } : {}),
    ...(inMetricDimension != null ? { inMetricDimension } : {}),
  };
  return result;
};

export const getValueApiColumn = (accessor: string, layer: TextBasedLayer) => {
  const col = layer.columns.find((c) => c.columnId === accessor)!;
  const format = fromFormatLensStateToAPI(col.params?.format);
  return {
    operation: 'value' as const,
    column: col.fieldName,
    ...(col.meta?.type ? { data_type: col.meta.type } : {}),
    ...(col.customLabel && col.label != null ? { label: col.label } : {}),
    ...(format ? { format } : {}),
  };
};
