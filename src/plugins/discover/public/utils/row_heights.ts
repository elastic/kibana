/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Storage } from '@kbn/kibana-utils-plugin/public';
import { isValidRowHeight } from './validate_row_height';

export interface DataGridOptionsRecord {
  previousRowHeight: number;
  previousConfigRowHeight: number;
}

const ROW_HEIGHT_KEY = 'discover:dataGridRowHeight';

export const getStoredRowHeight = (storage: Storage): DataGridOptionsRecord | null => {
  const entry = storage.get(ROW_HEIGHT_KEY);
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
  storage: Storage
) => {
  storage.set(ROW_HEIGHT_KEY, {
    previousRowHeight: newRowHeight,
    previousConfigRowHeight: configRowHeight,
  });
};
