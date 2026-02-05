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

/**
 * An ESQL column operation object that may include label and format metadata.
 * Accepts any object with a `column` field (e.g. esqlColumnSchema or
 * esqlColumnOperationWithLabelAndFormatSchema instances).
 */
interface EsqlColumnInput {
  column: string;
  label?: string;
  format?: LensApiMetricOperation['format'];
}

/**
 * Creates a TextBasedLayerColumn from an ESQL column operation object.
 * Label and format are automatically extracted when present.
 */
export const getValueColumn = (
  id: string,
  { column: fieldName, label, format: apiFormat }: EsqlColumnInput,
  fieldType: DatatableColumnType = 'string'
): TextBasedLayerColumn => {
  const format = apiFormat ? fromFormatAPIToLensState(apiFormat) : undefined;
  return {
    columnId: id,
    fieldName: fieldName || id,
    ...(fieldType ? { meta: { type: fieldType } } : {}),
    ...(label ? { label, customLabel: true } : {}),
    ...(format ? { params: { format } } : {}),
  };
};

export const getValueApiColumn = (accessor: string, layer: TextBasedLayer) => {
  const column = layer.columns.find((c) => c.columnId === accessor)!;
  const format = fromFormatLensStateToAPI(column.params?.format);
  return {
    operation: 'value' as const,
    column: column.fieldName,
    ...(column.customLabel && column.label ? { label: column.label } : {}),
    ...(format ? { format } : {}),
  };
};
