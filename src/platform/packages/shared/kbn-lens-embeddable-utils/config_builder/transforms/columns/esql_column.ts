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
import { VariableNamePrefix } from '@kbn/esql-types';
import type { LensApiESQLColumnWithFormat } from '../../schema/metric_ops';
import { fromFormatAPIToLensState, fromFormatLensStateToAPI } from './format';

const getESQLControlVariable = (fieldName: string): string | undefined => {
  if (!fieldName.startsWith(VariableNamePrefix.IDENTIFIER)) {
    return;
  }
  const variable = fieldName.slice(VariableNamePrefix.IDENTIFIER.length);
  return variable.length > 0 ? variable : undefined;
};

export const getValueColumn = (
  id: string,
  column?: LensApiESQLColumnWithFormat,
  fieldType: DatatableColumnType = 'string',
  inMetricDimension?: boolean
): TextBasedLayerColumn => {
  const format = fromFormatAPIToLensState(column?.format);
  const fieldName = column?.column || id;
  const variable = getESQLControlVariable(fieldName);

  return {
    columnId: id,
    fieldName,
    ...(column?.label != null ? { label: column.label, customLabel: true } : {}),
    ...(format ? { params: { format } } : {}),
    ...(fieldType ? { meta: { type: fieldType } } : {}),
    ...(inMetricDimension != null ? { inMetricDimension } : {}),
    ...(variable ? { variable } : {}),
  };
};

export const getValueApiColumn = (accessor: string, layer: TextBasedLayer) => {
  const column = layer.columns.find((c) => c.columnId === accessor)!;
  return {
    column: column.fieldName,
    ...(column.customLabel && column.label ? { label: column.label } : {}),
    ...(column.params?.format ? { format: fromFormatLensStateToAPI(column.params.format) } : {}),
  };
};
