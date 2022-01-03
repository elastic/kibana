/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { EuiDataGridRowHeightOption } from '@elastic/eui';
import { useCallback, useEffect, useMemo } from 'react';
import { Storage } from '../../../kibana_utils/public';
import { getServices } from '../kibana_services';
import { GetStateReturn as DiscoverGetStateReturn } from '../application/main/services/discover_state';
import { GetStateReturn as ContextGetStateReturn } from '../application/context/services/context_state';
import { ROW_HEIGHT_OPTION } from '../../common';

export type SerializedRowHeight = 'auto' | number;

interface UseRowHeightProps {
  savedSearchRowHeight?: SerializedRowHeight;
  storage: Storage;
  setAppState?: DiscoverGetStateReturn['setAppState'] | ContextGetStateReturn['setAppState'];
}

interface RowHeightOptionRecord {
  previousUsed: SerializedRowHeight;
  prevConfigRowHeight: SerializedRowHeight;
}

const ROW_HEIGHT_OPTION_KEY = 'discover:rowHeight';
const SINGLE_ROW_HEIGHT = 1;

const isAutoOption = (option?: EuiDataGridRowHeightOption): option is 'auto' => {
  if (option === 'auto') {
    return true;
  }
  return false;
};
const isLineOption = (option?: EuiDataGridRowHeightOption): option is { lineCount: number } => {
  if (typeof option === 'object' && option.lineCount) {
    return true;
  }
  return false;
};
const serializeRowHeight = (rowHeight?: EuiDataGridRowHeightOption): SerializedRowHeight => {
  if (isAutoOption(rowHeight)) {
    return 'auto';
  } else if (isLineOption(rowHeight)) {
    return rowHeight.lineCount;
  }

  // When defaultHeight is undefined, single row option enabled
  return SINGLE_ROW_HEIGHT;
};
const deserializeRowHeight = (
  serializedRowHeight?: SerializedRowHeight
): EuiDataGridRowHeightOption | undefined => {
  if (isAutoOption(serializedRowHeight)) {
    return 'auto';
  } else if (serializedRowHeight) {
    return { lineCount: serializedRowHeight };
  }
};

const validateRowHeight = (rowHeight: number | undefined) => {
  return !!rowHeight && Number.isInteger(rowHeight) && rowHeight > 0;
};
const getStoredRowHeight = (storage: Storage): RowHeightOptionRecord | null => {
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
const removeStoredRowHeight = (storage: Storage) => {
  storage.remove(ROW_HEIGHT_OPTION_KEY);
};
const setStoredRowHeight = (
  rowHeight: SerializedRowHeight,
  configRowHeight: SerializedRowHeight,
  storage: Storage
) => {
  storage.set(ROW_HEIGHT_OPTION_KEY, {
    previousUsed: rowHeight,
    prevConfigRowHeight: configRowHeight,
  });
};

export const useRowHeight = ({ savedSearchRowHeight, storage, setAppState }: UseRowHeightProps) => {
  const { uiSettings } = getServices();
  const configRowHeight: SerializedRowHeight = useMemo(
    () => uiSettings.get(ROW_HEIGHT_OPTION) || 'auto',
    [uiSettings]
  );

  const initialRowHeight: SerializedRowHeight = useMemo(() => {
    const rowHeightRecordRecord = getStoredRowHeight(storage);
    if (
      rowHeightRecordRecord !== null &&
      rowHeightRecordRecord.prevConfigRowHeight === configRowHeight
    ) {
      return rowHeightRecordRecord.previousUsed;
    }

    return configRowHeight;
  }, [configRowHeight, storage]);

  /**
   * When rowHeight has been changed in advanced settings,
   * local storage value should be removed
   */
  useEffect(() => {
    const rowHeightRecordRecord = getStoredRowHeight(storage);
    if (
      rowHeightRecordRecord !== null &&
      rowHeightRecordRecord.prevConfigRowHeight !== configRowHeight
    ) {
      removeStoredRowHeight(storage);
    }
    // current effect should be executed after resolving initialRowHeight
  }, [initialRowHeight, configRowHeight, storage]);

  const defaultRowHeight: EuiDataGridRowHeightOption | undefined = useMemo(
    () => deserializeRowHeight(savedSearchRowHeight || initialRowHeight),
    [initialRowHeight, savedSearchRowHeight]
  );

  const onRowHeightChange = useCallback(
    (rowHeight?: EuiDataGridRowHeightOption) => {
      // when it is not embeddable, update rowHeight state
      if (!!setAppState) {
        const serializedRowHeight = serializeRowHeight(rowHeight);
        setStoredRowHeight(serializedRowHeight, configRowHeight, storage);
        setAppState?.({ rowHeight: serializedRowHeight });
      }
    },
    [setAppState, configRowHeight, storage]
  );

  return {
    defaultRowHeight,
    onRowHeightChange,
  };
};
