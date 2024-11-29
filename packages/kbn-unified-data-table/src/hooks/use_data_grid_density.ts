/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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

export function getDensityFromStyle(style: EuiDataGridStyle) {
  return style.cellPadding === DATA_GRID_STYLE_COMPACT.cellPadding &&
    style.fontSize === DATA_GRID_STYLE_COMPACT.fontSize
    ? DataGridDensity.COMPACT
    : style.cellPadding === DATA_GRID_STYLE_NORMAL.cellPadding &&
      style.fontSize === DATA_GRID_STYLE_NORMAL.fontSize
    ? DataGridDensity.NORMAL
    : DataGridDensity.EXPANDED;
}

const DATA_GRID_DENSITY_STORAGE_KEY = 'dataGridDensity';
const getStorageKey = (consumer: string) => `${consumer}:${DATA_GRID_DENSITY_STORAGE_KEY}`;

export const getDataGridDensity = (storage: Storage, consumer: string): DataGridDensity => {
  return storage.get(getStorageKey(consumer)) ?? DataGridDensity.COMPACT;
};

export const useDataGridDensity = ({
  storage,
  consumer,
  dataGridDensityState,
  onUpdateDataGridDensity,
}: UseDataGridDensityProps) => {
  const dataGridDensity = useMemo<DataGridDensity>(() => {
    return dataGridDensityState ?? getDataGridDensity(storage, consumer);
  }, [consumer, dataGridDensityState, storage]);

  const onChangeDataGridDensity = useCallback(
    (gridStyle: EuiDataGridStyle) => {
      const newDensity = getDensityFromStyle(gridStyle);
      storage.set(getStorageKey(consumer), newDensity);
      onUpdateDataGridDensity?.(newDensity);
    },
    [storage, consumer, onUpdateDataGridDensity]
  );

  return {
    dataGridDensity,
    onChangeDataGridDensity,
  };
};
