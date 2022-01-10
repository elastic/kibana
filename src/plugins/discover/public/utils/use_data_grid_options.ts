/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { EuiDataGridRowHeightOption } from '@elastic/eui';
import { useEffect, useMemo } from 'react';
import {
  EuiDataGridRowHeightsOptions,
  EuiDataGridStyle,
} from '@elastic/eui/src/components/datagrid/data_grid_types';
import { Storage } from '../../../kibana_utils/public';
import { getServices } from '../kibana_services';
import { ROW_HEIGHT_OPTION } from '../../common';
import { DENSITY_STYLES, GRID_STYLE } from '../components/discover_grid/constants';
import { isValidRowHeight } from './validate_row_height';

export type SerializedRowHeight = number;

type RowDensity = 'compact' | 'normal' | 'expanded';

interface UseRowHeightProps {
  rowHeightFromState?: SerializedRowHeight;
  onUpdateRowHeight?: (rowHeight?: SerializedRowHeight) => void;
}

interface DataGridOptionsRecord {
  previousRowHeight: SerializedRowHeight;
  previousConfigRowHeight: SerializedRowHeight;
}

const ROW_HEIGHT_KEY = 'discover:dataGridRowHeight';
const DENSITY_KEY = 'discover:dataGridRowDensity';
const SINGLE_ROW_HEIGHT_OPTION = 0;
const AUTO_ROW_HEIGHT_OPTION = -1;
const ROW_DENSITY = ['compact', 'normal', 'expanded'];

const serializeRowHeight = (rowHeight?: EuiDataGridRowHeightOption): SerializedRowHeight => {
  if (rowHeight === 'auto') {
    return AUTO_ROW_HEIGHT_OPTION;
  } else if (typeof rowHeight === 'object' && rowHeight.lineCount) {
    return rowHeight.lineCount; // custom
  }

  return SINGLE_ROW_HEIGHT_OPTION;
};
const deserializeRowHeight = (
  serializedRowHeight: SerializedRowHeight
): EuiDataGridRowHeightOption | undefined => {
  if (serializedRowHeight === AUTO_ROW_HEIGHT_OPTION) {
    return 'auto';
  } else if (serializedRowHeight === SINGLE_ROW_HEIGHT_OPTION) {
    return undefined;
  }

  return { lineCount: serializedRowHeight }; // custom
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

const getStoredRowDensity = (storage: Storage): RowDensity | null => {
  const density = storage.get(DENSITY_KEY);
  if (density !== null && Object.values(ROW_DENSITY).includes(density)) {
    return density;
  }
  return null;
};

const convertGridStylesToSelection = (gridStyles: EuiDataGridStyle): RowDensity => {
  if (gridStyles?.fontSize === 's' && gridStyles?.cellPadding === 's') return 'compact';
  if (gridStyles?.fontSize === 'm' && gridStyles?.cellPadding === 'm') return 'normal';
  if (gridStyles?.fontSize === 'l' && gridStyles?.cellPadding === 'l') return 'expanded';
  return 'normal';
};

const chooseRowHeight = ({
  rowHeightFromState,
  rowHeightFromLS,
  configRowHeight,
}: {
  rowHeightFromState?: SerializedRowHeight;
  rowHeightFromLS: DataGridOptionsRecord | null;
  configRowHeight: SerializedRowHeight;
}) => {
  const configHasNotChanged = (
    localStorageRecord: DataGridOptionsRecord | null
  ): localStorageRecord is DataGridOptionsRecord =>
    localStorageRecord !== null && configRowHeight === localStorageRecord.previousConfigRowHeight;

  // select rowHeight
  let defaultRowHeight: SerializedRowHeight;
  if (typeof rowHeightFromState === 'number') {
    defaultRowHeight = rowHeightFromState;
  } else if (configHasNotChanged(rowHeightFromLS)) {
    // if advanced setting has not been changed, use value from local storage
    defaultRowHeight = rowHeightFromLS.previousRowHeight;
  } else {
    defaultRowHeight = configRowHeight;
  }

  return defaultRowHeight;
};

export const useDataGridOptions = ({
  rowHeightFromState,
  onUpdateRowHeight,
}: UseRowHeightProps) => {
  const { storage, uiSettings } = getServices();

  const gridStyle: EuiDataGridStyle = useMemo(() => {
    const initialRowDensity = getStoredRowDensity(storage);
    const overridingStyles =
      initialRowDensity !== null ? DENSITY_STYLES[initialRowDensity] : DENSITY_STYLES.normal;

    return {
      ...GRID_STYLE,
      ...overridingStyles,
      onChange: (newStyles) => {
        const newRowDensity = convertGridStylesToSelection(newStyles);
        storage.set(DENSITY_KEY, newRowDensity);
      },
    };
  }, [storage]);

  const configRowHeight = useMemo(() => uiSettings.get(ROW_HEIGHT_OPTION), [uiSettings]);

  /**
   * This effect should be removed after fixing https://github.com/elastic/eui/issues/5524
   */
  useEffect(() => {
    const rowHeightFromLS = getStoredRowHeight(storage);
    const newRowHeight = chooseRowHeight({
      rowHeightFromState,
      rowHeightFromLS,
      configRowHeight,
    });

    updateStoredRowHeight(newRowHeight, configRowHeight, storage);
    onUpdateRowHeight?.(newRowHeight);
  }, [rowHeightFromState, onUpdateRowHeight, storage, uiSettings, configRowHeight]);

  const rowHeightsOptions = useMemo((): EuiDataGridRowHeightsOptions => {
    const rowHeightFromLS = getStoredRowHeight(storage);
    const defaultRowHeight = chooseRowHeight({
      rowHeightFromState,
      rowHeightFromLS,
      configRowHeight,
    });

    return {
      defaultHeight: deserializeRowHeight(defaultRowHeight),
      onChange: ({ defaultHeight: newRowHeight }: EuiDataGridRowHeightsOptions) => {
        const newSerializedRowHeight = serializeRowHeight(newRowHeight);
        updateStoredRowHeight(newSerializedRowHeight, configRowHeight, storage);
        onUpdateRowHeight?.(newSerializedRowHeight);
      },
    };
  }, [storage, rowHeightFromState, configRowHeight, onUpdateRowHeight]);

  return {
    rowHeightsOptions,
    gridStyle,
  };
};
