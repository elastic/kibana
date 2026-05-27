/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TextBasedLayerColumn } from '@kbn/lens-common';
import type { DatatableColumnType } from '@kbn/expressions-plugin/common';

export function getValueColumn(
  id: string,
  fieldName?: string,
  type?: DatatableColumnType,
  format?: NonNullable<TextBasedLayerColumn['params']>['format'],
  label?: string
): TextBasedLayerColumn {
  return {
    columnId: id,
    fieldName: fieldName || id,
    ...(type ? { meta: { type } } : {}),
    ...(format ? { params: { format } } : {}),
    // `customLabel: true` tells Lens to use `label` as-is instead of
    // deriving one from the field name (the default behaviour for ES|QL
    // text-based columns is to render the bare column name — that's what
    // showed up as the literal string "value" above each KPI headline
    // before this lever existed). When the caller doesn't pass a label
    // we leave the column unlabelled so Lens keeps its fallback.
    ...(label !== undefined ? { label, customLabel: true } : {}),
  };
}
