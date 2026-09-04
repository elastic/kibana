/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { BulkItemResponse } from '../types';

export type BulkUpdaterWriteResult = 'updated' | 'noop' | 'not_found';

/**
 * Maps a single bulk-updater item response to a coarse write outcome.
 * Throws when ES returned an unexpected error (document missing or ES failure).
 */
export const getBulkUpdaterWriteResult = (
  item: BulkItemResponse | undefined
): BulkUpdaterWriteResult => {
  if (!item) {
    return 'not_found';
  }

  if (item.error?.type === 'document_missing_exception') {
    return 'not_found';
  }

  if (item.error) {
    throw new Error(`Bulk updater write failed for ${item.id}: ${JSON.stringify(item.error)}`);
  }

  if (item.result === 'updated') {
    return 'updated';
  }

  if (item.result === 'noop') {
    return 'noop';
  }

  return 'noop';
};
