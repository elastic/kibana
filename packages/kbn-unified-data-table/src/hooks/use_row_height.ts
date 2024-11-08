/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Storage } from '@kbn/kibana-utils-plugin/public';
import { useCallback, useMemo } from 'react';
import { isValidRowHeight } from '../utils/validate_row_height';
import {
  DataGridOptionsRecord,
  getStoredRowHeight,
  updateStoredRowHeight,
} from '../utils/row_heights';
import { ROWS_HEIGHT_OPTIONS } from '../constants';
import { RowHeightMode, RowHeightSettingsProps } from '../components/row_height_settings';

interface UseRowHeightProps {
  storage: Storage;
  consumer: string;
  key: string;
  configRowHeight: number;
  rowHeightState?: number;
  onUpdateRowHeight?: (rowHeight: number) => void;
}

interface ResolveRowHeightParams {
  storage: Storage;
  consumer: string;
  key: string;
  configRowHeight: number;
  rowHeightState?: number;
}

const resolveRowHeight = ({
  storage,
  consumer,
  key,
  configRowHeight,
  rowHeightState,
}: ResolveRowHeightParams): number => {
  const rowHeightFromLS = getStoredRowHeight(storage, consumer, key);

  const configHasNotChanged = (
    localStorageRecord: DataGridOptionsRecord | null
  ): localStorageRecord is DataGridOptionsRecord =>
    localStorageRecord !== null && configRowHeight === localStorageRecord.previousConfigRowHeight;

  let currentRowLines: number;
  if (isValidRowHeight(rowHeightState)) {
    currentRowLines = rowHeightState;
  } else if (configHasNotChanged(rowHeightFromLS)) {
    currentRowLines = rowHeightFromLS.previousRowHeight;
  } else {
    currentRowLines = configRowHeight;
  }

  return currentRowLines;
};

export const ROW_HEIGHT_STORAGE_KEY = 'dataGridRowHeight';

export const getRowHeight = ({
  storage,
  consumer,
  rowHeightState,
  configRowHeight,
}: Pick<ResolveRowHeightParams, 'storage' | 'consumer' | 'rowHeightState'> & {
  configRowHeight?: number;
}) => {
  return resolveRowHeight({
    storage,
    consumer,
    key: ROW_HEIGHT_STORAGE_KEY,
    configRowHeight: configRowHeight ?? ROWS_HEIGHT_OPTIONS.default,
    rowHeightState,
  });
};

export const useRowHeight = ({
  storage,
  consumer,
  key,
  configRowHeight,
  rowHeightState,
  onUpdateRowHeight,
}: UseRowHeightProps) => {
  const rowHeightLines = useMemo(() => {
    return resolveRowHeight({
      storage,
      consumer,
      key,
      configRowHeight,
      rowHeightState,
    });
  }, [configRowHeight, consumer, key, rowHeightState, storage]);

  const rowHeight = useMemo<RowHeightSettingsProps['rowHeight']>(() => {
    switch (rowHeightLines) {
      case ROWS_HEIGHT_OPTIONS.auto:
        return RowHeightMode.auto;
      case ROWS_HEIGHT_OPTIONS.single:
        return RowHeightMode.single;
      default:
        return RowHeightMode.custom;
    }
  }, [rowHeightLines]);

  const onChangeRowHeight = useCallback(
    (newRowHeight: RowHeightSettingsProps['rowHeight']) => {
      let newRowHeightLines: number;

      switch (newRowHeight) {
        case RowHeightMode.auto:
          newRowHeightLines = ROWS_HEIGHT_OPTIONS.auto;
          break;
        case RowHeightMode.single:
          newRowHeightLines = ROWS_HEIGHT_OPTIONS.single;
          break;
        default:
          newRowHeightLines = configRowHeight;
      }

      updateStoredRowHeight(newRowHeightLines, configRowHeight, storage, consumer, key);
      onUpdateRowHeight?.(newRowHeightLines);
    },
    [configRowHeight, consumer, key, onUpdateRowHeight, storage]
  );

  const onChangeRowHeightLines = useCallback(
    (newRowHeightLines: number) => {
      updateStoredRowHeight(newRowHeightLines, configRowHeight, storage, consumer, key);
      onUpdateRowHeight?.(newRowHeightLines);
    },
    [configRowHeight, consumer, key, onUpdateRowHeight, storage]
  );

  return {
    rowHeight,
    rowHeightLines,
    onChangeRowHeight: onUpdateRowHeight ? onChangeRowHeight : undefined,
    onChangeRowHeightLines: onUpdateRowHeight ? onChangeRowHeightLines : undefined,
  };
};
