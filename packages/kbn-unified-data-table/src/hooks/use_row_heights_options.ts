/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { EuiDataGridRowHeightOption, EuiDataGridRowHeightsOptions } from '@elastic/eui';
import type { Storage } from '@kbn/kibana-utils-plugin/public';
import { useMemo } from 'react';
import { isValidRowHeight } from '../utils/validate_row_height';
import {
  DataGridOptionsRecord,
  getStoredRowHeight,
  updateStoredRowHeight,
} from '../utils/row_heights';
import { defaultRowLineHeight, ROWS_HEIGHT_OPTIONS } from '../constants';

interface UseRowHeightProps {
  rowHeightState?: number;
  onUpdateRowHeight?: (rowHeight: number) => void;
  storage: Storage;
  configRowHeight?: number;
  consumer: string;
  rowLineHeight?: string;
}

/**
 * Converts rowHeight of EuiDataGrid to rowHeight number (-1 to 20)
 */
const serializeRowHeight = (rowHeight?: EuiDataGridRowHeightOption): number => {
  if (rowHeight === 'auto' || rowHeight === ROWS_HEIGHT_OPTIONS.auto) {
    return ROWS_HEIGHT_OPTIONS.auto;
  } else if (typeof rowHeight === 'object' && rowHeight.lineCount) {
    return rowHeight.lineCount; // custom
  } else if (typeof rowHeight === 'number') {
    return rowHeight;
  }

  return ROWS_HEIGHT_OPTIONS.single;
};

/**
 * Converts rowHeight number (-1 to 20) of EuiDataGrid rowHeight
 */
const deserializeRowHeight = (number: number): EuiDataGridRowHeightOption | undefined => {
  if (number === ROWS_HEIGHT_OPTIONS.auto) {
    return 'auto';
  } else if (number === ROWS_HEIGHT_OPTIONS.single) {
    return undefined;
  }

  return { lineCount: number }; // custom
};

export const useRowHeightsOptions = ({
  rowHeightState,
  onUpdateRowHeight,
  storage,
  configRowHeight = ROWS_HEIGHT_OPTIONS.default,
  consumer,
  rowLineHeight = defaultRowLineHeight,
}: UseRowHeightProps) => {
  return useMemo((): EuiDataGridRowHeightsOptions => {
    const rowHeightFromLS = getStoredRowHeight(storage, consumer);

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

    const defaultHeight = deserializeRowHeight(rowHeight);

    return {
      defaultHeight,
      lineHeight: rowLineHeight,
      onChange: ({ defaultHeight: newRowHeight }: EuiDataGridRowHeightsOptions) => {
        if (newRowHeight === defaultHeight && typeof rowHeightState === 'undefined') {
          // ignore, no changes required
          return;
        }
        const newSerializedRowHeight = serializeRowHeight(
          // pressing "Reset to default" triggers onChange with the same value
          newRowHeight === defaultHeight ? configRowHeight : newRowHeight
        );
        updateStoredRowHeight(newSerializedRowHeight, configRowHeight, storage, consumer);
        onUpdateRowHeight?.(newSerializedRowHeight);
      },
    };
  }, [storage, consumer, rowHeightState, rowLineHeight, configRowHeight, onUpdateRowHeight]);
};
