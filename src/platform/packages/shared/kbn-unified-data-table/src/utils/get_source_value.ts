/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataTableRecord } from '@kbn/discover-utils/src/types';

/** Extracts the effective `_source` value from a plain record (ES|QL).*/
export const getSourceValue = ({
  row,
  columnId,
  isPlainRecord,
}: {
  row: DataTableRecord;
  columnId: string;
  isPlainRecord?: boolean;
}): Record<string, unknown> | undefined => {
  if (!isPlainRecord || columnId !== '_source') {
    return undefined;
  }

  const sourceValue = row.flattened?.[columnId];

  return sourceValue && typeof sourceValue === 'object'
    ? (sourceValue as Record<string, unknown>)
    : undefined;
};
