/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Storage } from '../../../../../kibana_utils/public';
import { SerializedRowHeight } from './convert_row_height_option';

interface RowHeightOptionRecord {
  previousUsed: SerializedRowHeight;
  prevConfigRowHeight: SerializedRowHeight;
}

const ROW_HEIGHT_OPTION_KEY = 'discover:rowHeight';

const validateRowHeight = (rowHeight: number | undefined) => {
  return !!rowHeight && Number.isInteger(rowHeight) && rowHeight > 0;
};

export const getStoredRowHeight = (storage: Storage): RowHeightOptionRecord | null => {
  const entry = storage.get(ROW_HEIGHT_OPTION_KEY);
  if (
    typeof entry === 'object' &&
    entry !== null &&
    (entry.previousUsed === 'auto' || validateRowHeight(entry.previousUsed)) &&
    (entry.prevConfigRowHeight === 'auto' || validateRowHeight(entry.prevConfigRowHeight))
  ) {
    return entry;
  }
  return null;
};

export const removeStoredRowHeight = (storage: Storage) => {
  storage.remove(ROW_HEIGHT_OPTION_KEY);
};

export const setStoredRowHeight = (
  rowHeight: SerializedRowHeight,
  configRowHeight: SerializedRowHeight,
  storage: Storage
) => {
  storage.set(ROW_HEIGHT_OPTION_KEY, {
    previousUsed: rowHeight,
    prevConfigRowHeight: configRowHeight,
  });
};
