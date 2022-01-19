/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { EuiDataGridRowHeightOption, EuiDataGridRowHeightsOptions } from '@elastic/eui';
import { useEffect, useMemo } from 'react';
import { IUiSettingsClient } from 'kibana/public';
import { Storage } from '../../../kibana_utils/public';
import { ROW_HEIGHT_OPTION } from '../../common';
import { isValidRowHeight } from './validate_row_height';

interface UseRowHeightProps {
  rowHeightState?: number;
  onUpdateRowHeight?: (rowHeight: number) => void;
  storage: Storage;
  uiSettings: IUiSettingsClient;
}

interface DataGridOptionsRecord {
  previousRowHeight: number;
  previousConfigRowHeight: number;
}

/**
 * Row height might be a value from -1 to 20
 * A value of -1 automatically adjusts the row height to fit the contents.
 * A value of 0 displays the content in a single line.
 * A value from 1 to 20 represents number of lines of Document explorer row to display.
 */
const SINGLE_ROW_HEIGHT_OPTION = 0;
const AUTO_ROW_HEIGHT_OPTION = -1;
const ROW_HEIGHT_KEY = 'discover:dataGridRowHeight';

/**
 * Converts rowHeight of EuiDataGrid to rowHeight number (-1 to 20)
 */
const serializeRowHeight = (rowHeight?: EuiDataGridRowHeightOption): number => {
  if (rowHeight === 'auto') {
    return AUTO_ROW_HEIGHT_OPTION;
  } else if (typeof rowHeight === 'object' && rowHeight.lineCount) {
    return rowHeight.lineCount; // custom
  }

  return SINGLE_ROW_HEIGHT_OPTION;
};

/**
 * Converts rowHeight number (-1 to 20) of EuiDataGrid rowHeight
 */
const deserializeRowHeight = (number: number): EuiDataGridRowHeightOption | undefined => {
  if (number === AUTO_ROW_HEIGHT_OPTION) {
    return 'auto';
  } else if (number === SINGLE_ROW_HEIGHT_OPTION) {
    return undefined;
  }

  return { lineCount: number }; // custom
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

const updateStoredRowHeight = (newRowHeight: number, configRowHeight: number, storage: Storage) => {
  storage.set(ROW_HEIGHT_KEY, {
    previousRowHeight: newRowHeight,
    previousConfigRowHeight: configRowHeight,
  });
};

export const useRowHeightsOptions = ({
  rowHeightState,
  onUpdateRowHeight,
  storage,
  uiSettings,
}: UseRowHeightProps) => {
  /**
   * The following should be removed after EUI update
   * with https://github.com/elastic/eui/issues/5524
   */
  useEffect(() => {
    if (isValidRowHeight(rowHeightState)) {
      onUpdateRowHeight?.(rowHeightState);
      updateStoredRowHeight(rowHeightState, uiSettings.get(ROW_HEIGHT_OPTION), storage);
    }
  }, [rowHeightState, onUpdateRowHeight, storage, uiSettings]);

  const defaultRowHeights = useMemo((): EuiDataGridRowHeightsOptions => {
    const rowHeightFromLS = getStoredRowHeight(storage);
    const configRowHeight = uiSettings.get(ROW_HEIGHT_OPTION);

    const configHasNotChanged = (
      localStorageRecord: DataGridOptionsRecord | null
    ): localStorageRecord is DataGridOptionsRecord =>
      localStorageRecord !== null && configRowHeight === localStorageRecord.previousConfigRowHeight;

    let rowHeight;
    if (isValidRowHeight(rowHeightState)) {
      rowHeight = rowHeightState;
    } else if (configHasNotChanged(rowHeightFromLS)) {
      rowHeight = rowHeightFromLS.previousRowHeight;
    } else {
      rowHeight = configRowHeight;
    }

    // update local storage value when config has changed
    if (!configHasNotChanged(rowHeightFromLS)) {
      updateStoredRowHeight(configRowHeight, configRowHeight, storage);
    }

    return {
      defaultHeight: deserializeRowHeight(rowHeight),
      onChange: ({ defaultHeight: newRowHeight }: EuiDataGridRowHeightsOptions) => {
        const newSerializedRowHeight = serializeRowHeight(newRowHeight);
        updateStoredRowHeight(newSerializedRowHeight, configRowHeight, storage);
        onUpdateRowHeight?.(newSerializedRowHeight);
      },
    };
  }, [rowHeightState, uiSettings, storage, onUpdateRowHeight]);

  return defaultRowHeights;
};
