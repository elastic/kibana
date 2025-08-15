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
import usePrevious from 'react-use/lib/usePrevious';
import useLatest from 'react-use/lib/useLatest';
import { isValidRowHeight } from '../utils/validate_row_height';
import type { DataGridOptionsRecord } from '../utils/row_heights';
import { getStoredRowHeight, updateStoredRowHeight } from '../utils/row_heights';
import { ROWS_HEIGHT_OPTIONS } from '../constants';
import type { RowHeightSettingsProps } from '../components/row_height_settings';
import { RowHeightMode } from '../components/row_height_settings';
import { useRestorableRef } from '../restorable_state';

export enum RowHeightType {
  header = 'header',
  row = 'row',
}

export interface UseRowHeightProps {
  type: RowHeightType;
  storage: Storage;
  consumer: string;
  key: string;
  defaultRowHeight: number;
  configRowHeight?: number;
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
  type,
  storage,
  consumer,
  key,
  defaultRowHeight,
  configRowHeight = defaultRowHeight,
  rowHeightState,
  onUpdateRowHeight,
}: UseRowHeightProps) => {
  const [initialValue] = useState(() =>
    resolveRowHeight({
      storage,
      consumer,
      key,
      configRowHeight,
      rowHeightState,
    })
  );

  const restorableRowHeightRef = useRestorableRef(
    type === RowHeightType.header ? 'headerRowHeight' : 'rowHeight',
    initialValue
  );

  const rowHeightLines = useMemo(() => {
    return resolveRowHeight({
      storage,
      consumer,
      key,
      configRowHeight,
      rowHeightState: rowHeightState ?? restorableRowHeightRef.current,
    });
  }, [configRowHeight, consumer, key, rowHeightState, storage, restorableRowHeightRef]);

  restorableRowHeightRef.current = rowHeightLines; // Update the ref with the latest row height lines

  const getAdjustedLineCount = useCallback(
    (lineCount: number | undefined) => {
      return lineCount !== undefined && lineCount > 0
        ? lineCount
        : configRowHeight > 0
        ? configRowHeight
        : defaultRowHeight;
    },
    [configRowHeight, defaultRowHeight]
  );

  const [lineCountInput, setLineCountInput] = useState<number | undefined>(
    getAdjustedLineCount(rowHeightLines)
  );

  const rowHeight = useMemo(() => {
    return rowHeightLines === ROWS_HEIGHT_OPTIONS.auto ? RowHeightMode.auto : RowHeightMode.custom;
  }, [rowHeightLines]);

  const onChangeRowHeight = useCallback(
    (newRowHeight: RowHeightSettingsProps['rowHeight']) => {
      const newRowHeightLines =
        newRowHeight === RowHeightMode.auto
          ? ROWS_HEIGHT_OPTIONS.auto
          : getAdjustedLineCount(lineCountInput);

      updateStoredRowHeight(newRowHeightLines, configRowHeight, storage, consumer, key);
      onUpdateRowHeight?.(newRowHeightLines);
    },
    [
      configRowHeight,
      consumer,
      getAdjustedLineCount,
      key,
      lineCountInput,
      onUpdateRowHeight,
      storage,
    ]
  );

  const onChangeRowHeightLines = useCallback(
    (newRowHeightLines: number, isValid: boolean) => {
      if (isValid) {
        updateStoredRowHeight(newRowHeightLines, configRowHeight, storage, consumer, key);
        onUpdateRowHeight?.(newRowHeightLines);
      }

      setLineCountInput(newRowHeightLines === 0 ? undefined : newRowHeightLines);
    },
    [configRowHeight, consumer, key, onUpdateRowHeight, storage]
  );

  const prevRowHeight = useLatest(usePrevious(rowHeight) ?? rowHeight);
  const prevRowHeightLines = useLatest(usePrevious(rowHeightLines) ?? rowHeightLines);

  useEffect(() => {
    if (rowHeight === RowHeightMode.auto && prevRowHeight.current === RowHeightMode.custom) {
      // If switching from custom to auto, reset the line count input to the last valid line count
      setLineCountInput(getAdjustedLineCount(prevRowHeightLines.current));
    } else if (rowHeight === RowHeightMode.custom) {
      // If row height lines change while in custom mode (e.g. by consumer), sync the line count input
      setLineCountInput(getAdjustedLineCount(rowHeightLines));
    }
  }, [getAdjustedLineCount, prevRowHeight, prevRowHeightLines, rowHeight, rowHeightLines]);

  return {
    rowHeight,
    rowHeightLines,
    lineCountInput,
    onChangeRowHeight: onUpdateRowHeight ? onChangeRowHeight : undefined,
    onChangeRowHeightLines: onUpdateRowHeight ? onChangeRowHeightLines : undefined,
  };
};
