/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Storage } from '@kbn/kibana-utils-plugin/public';
import { useCallback, useState } from 'react';
import { EuiDataGridStyle } from '@elastic/eui';
import { GRID_STYLE } from '../constants';

interface UseDataGridStyleProps {
  storage: Storage;
  consumer: string;
  dataGridStyleState?: EuiDataGridStyle;
  onUpdateDataGridStyle?: (gridStyle: EuiDataGridStyle) => void;
}

export const DATA_GRID_STYLE_STORAGE_KEY = 'dataGridStyle';

export const useDataGridStyle = ({
  storage,
  consumer,
  dataGridStyleState,
  onUpdateDataGridStyle,
}: UseDataGridStyleProps) => {
  const storageKey = `${consumer}:${DATA_GRID_STYLE_STORAGE_KEY}`;
  const [dataGridStyle, setDataGridStyle] = useState<EuiDataGridStyle>(
    dataGridStyleState ?? storage.get(storageKey) ?? GRID_STYLE
  );

  const onChangeDataGridStyle = useCallback(
    (newDataGridStyle: EuiDataGridStyle) => {
      setDataGridStyle(newDataGridStyle);
      storage.set(storageKey, newDataGridStyle);
      onUpdateDataGridStyle?.(newDataGridStyle);
    },
    [storageKey, storage, onUpdateDataGridStyle]
  );

  return {
    dataGridStyle,
    onChangeDataGridStyle,
  };
};
