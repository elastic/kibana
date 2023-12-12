/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { TextBasedLayerColumn } from '@kbn/lens-plugin/public/datasources/text_based/types';
import type { DatatableColumnType } from '@kbn/expressions-plugin/common';

export function getValueColumn(
  id: string,
  fieldName?: string,
  type?: DatatableColumnType
): TextBasedLayerColumn {
  return {
    columnId: id,
    fieldName: fieldName || id,
    ...(type ? { meta: { type } } : {}),
  };
}
