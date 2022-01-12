/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IUiSettingsClient } from 'kibana/public';
import { Storage } from '../../../kibana_utils/public';
import { ROW_HEIGHT_OPTION } from '../../common';

const ROW_HEIGHT_KEY = 'discover:dataGridRowHeight';
const MIN_ROW_HEIGHT = -1;
const MAX_ROW_HEIGHT = 20;

interface DataGridOptionsRecord {
  previousRowHeight: number;
  previousConfigRowHeight: number;
}

const isValidRowHeight = (rowHeight?: number) => {
  return (
    typeof rowHeight === 'number' &&
    !Number.isNaN(rowHeight) &&
    rowHeight >= MIN_ROW_HEIGHT &&
    rowHeight <= MAX_ROW_HEIGHT
  );
};

const getStoredRowHeight = (storage: Storage): DataGridOptionsRecord | null => {
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

export const getDefaultRowHeight = (config: IUiSettingsClient, storage: Storage): number => {
  const rowHeightFromLS = getStoredRowHeight(storage);
  const configRowHeight = config.get(ROW_HEIGHT_OPTION);

  const configHasNotChanged = (
    localStorageRecord: DataGridOptionsRecord | null
  ): localStorageRecord is DataGridOptionsRecord =>
    localStorageRecord !== null && configRowHeight === localStorageRecord.previousConfigRowHeight;

  // if advanced setting has not been changed, use value from local storage
  return configHasNotChanged(rowHeightFromLS) ? rowHeightFromLS.previousRowHeight : configRowHeight;
};
