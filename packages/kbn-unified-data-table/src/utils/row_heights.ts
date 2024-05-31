/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Storage } from '@kbn/kibana-utils-plugin/public';
import { isValidRowHeight } from './validate_row_height';

export interface DataGridOptionsRecord {
  previousRowHeight: number;
  previousConfigRowHeight: number;
}

const getRowHeightKey = (consumer: string, key: string) => `${consumer}:${key}`;

export const getStoredRowHeight = (
  storage: Storage,
  consumer: string,
  key: string
): DataGridOptionsRecord | null => {
  const entry = storage.get(getRowHeightKey(consumer, key));
  if (
    typeof entry === 'object' &&
    entry !== null &&
    isValidRowHeight(entry.previousRowHeight) &&
    isValidRowHeight(entry.previousConfigRowHeight)
  ) {
    return entry;
  }
  return null;
};

export const updateStoredRowHeight = (
  newRowHeight: number,
  configRowHeight: number,
  storage: Storage,
  consumer: string,
  key: string
) => {
  storage.set(getRowHeightKey(consumer, key), {
    previousRowHeight: newRowHeight,
    previousConfigRowHeight: configRowHeight,
  });
};
