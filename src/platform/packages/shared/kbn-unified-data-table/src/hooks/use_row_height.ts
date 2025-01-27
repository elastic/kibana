/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Storage } from '@kbn/kibana-utils-plugin/public';
import { useCallback, useEffect, useMemo, useState } from 'react';
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

  return currentRowLines === 0 ? 1 : currentRowLines;
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

  const [lineCountInput, setLineCountInput] = useState(
    rowHeightLines < 0 ? configRowHeight : rowHeightLines
  );

  const rowHeight = useMemo<RowHeightSettingsProps['rowHeight']>(() => {
    return rowHeightLines === ROWS_HEIGHT_OPTIONS.auto ? RowHeightMode.auto : RowHeightMode.custom;
  }, [rowHeightLines]);

  const onChangeRowHeight = useCallback(
    (newRowHeight: RowHeightSettingsProps['rowHeight']) => {
      const newRowHeightLines =
        newRowHeight === RowHeightMode.auto ? ROWS_HEIGHT_OPTIONS.auto : lineCountInput;

      updateStoredRowHeight(newRowHeightLines, configRowHeight, storage, consumer, key);
      onUpdateRowHeight?.(newRowHeightLines);
    },
    [configRowHeight, consumer, key, onUpdateRowHeight, storage, lineCountInput]
  );

  const onChangeRowHeightLines = useCallback(
    (newRowHeightLines: number) => {
      updateStoredRowHeight(newRowHeightLines, configRowHeight, storage, consumer, key);
      onUpdateRowHeight?.(newRowHeightLines);
    },
    [configRowHeight, consumer, key, onUpdateRowHeight, storage]
  );

  useEffect(() => {
    if (rowHeight === RowHeightMode.custom) {
      setLineCountInput(rowHeightLines > 0 ? rowHeightLines : configRowHeight);
    }
  }, [rowHeightLines, configRowHeight, rowHeight]);

  return {
    rowHeight,
    rowHeightLines,
    lineCountInput,
    onChangeRowHeight: onUpdateRowHeight ? onChangeRowHeight : undefined,
    onChangeRowHeightLines: onUpdateRowHeight ? onChangeRowHeightLines : undefined,
  };
};
