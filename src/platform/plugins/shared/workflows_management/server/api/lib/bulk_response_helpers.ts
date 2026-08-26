/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { estypes } from '@elastic/elasticsearch';

/**
 * Extracts a human-readable error string from an ES bulk response error cause.
 */
export const extractBulkItemError = (error: estypes.ErrorCause | string | undefined): string => {
  if (error === undefined) return 'Unknown error';
  if (typeof error === 'string') return error;
  if (typeof error === 'object' && 'reason' in error) {
    return error.reason ?? JSON.stringify(error);
  }
  return JSON.stringify(error);
};

interface BulkResultItem {
  index?: { _id?: string | null; status?: number; error?: estypes.ErrorCause };
  create?: { _id?: string | null; status?: number; error?: estypes.ErrorCause };
}

/**
 * Partitions ES bulk response items into successful IDs and failure entries.
 * Works for both `index` and `create` operations.
 */
export const partitionBulkResults = (
  items: BulkResultItem[]
): { successIds: string[]; failures: Array<{ id: string; error: string }> } => {
  const successIds: string[] = [];
  const failures: Array<{ id: string; error: string }> = [];

  for (const item of items) {
    const operation = item.index ?? item.create;
    if (operation?.error) {
      failures.push({
        id: operation._id ?? 'unknown',
        error: extractBulkItemError(operation.error),
      });
    } else if (operation?._id) {
      successIds.push(operation._id);
    }
  }

  return { successIds, failures };
};
