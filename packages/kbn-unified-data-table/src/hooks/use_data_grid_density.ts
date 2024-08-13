/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { EuiDataGridStyle } from '@elastic/eui';
import type { Storage } from '@kbn/kibana-utils-plugin/public';
import { useCallback, useMemo } from 'react';
import {
  DATA_GRID_STYLE_COMPACT,
  DATA_GRID_STYLE_EXPANDED,
  DATA_GRID_STYLE_NORMAL,
  DataGridDensity,
} from '../constants';

export const DATA_GRID_DENSITY_STYLE_MAP = {
  [DataGridDensity.COMPACT]: DATA_GRID_STYLE_COMPACT,
  [DataGridDensity.NORMAL]: DATA_GRID_STYLE_NORMAL,
  [DataGridDensity.EXPANDED]: DATA_GRID_STYLE_EXPANDED,
};

interface UseDataGridDensityProps {
  storage: Storage;
  consumer: string;
  dataGridDensityState?: DataGridDensity;
  onUpdateDataGridDensity?: (density: DataGridDensity) => void;
}

export const DATA_GRID_DENSITY_STORAGE_KEY = 'dataGridDensity';

export function getDensityFromStyle(style: EuiDataGridStyle) {
  return style.cellPadding === DATA_GRID_STYLE_COMPACT.cellPadding &&
    style.fontSize === DATA_GRID_STYLE_COMPACT.fontSize
    ? DataGridDensity.COMPACT
    : style.cellPadding === DATA_GRID_STYLE_NORMAL.cellPadding &&
      style.fontSize === DATA_GRID_STYLE_NORMAL.fontSize
    ? DataGridDensity.NORMAL
    : DataGridDensity.EXPANDED;
}

export const useDataGridDensity = ({
  storage,
  consumer,
  dataGridDensityState,
  onUpdateDataGridDensity,
}: UseDataGridDensityProps) => {
  const storageKey = `${consumer}:${DATA_GRID_DENSITY_STORAGE_KEY}`;
  const dataGridDensity = useMemo<DataGridDensity>(() => {
    return dataGridDensityState ?? storage.get(storageKey) ?? DataGridDensity.COMPACT;
  }, [dataGridDensityState, storage, storageKey]);

  const onChangeDataGridDensity = useCallback(
    (gridStyle: EuiDataGridStyle) => {
      const newDensity = getDensityFromStyle(gridStyle);
      storage.set(storageKey, newDensity);
      onUpdateDataGridDensity?.(newDensity);
    },
    [storageKey, storage, onUpdateDataGridDensity]
  );

  return {
    dataGridDensity,
    onChangeDataGridDensity,
  };
};
