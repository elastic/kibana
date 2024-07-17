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

interface UseDensityProps {
  storage: Storage;
  consumer: string;
  onUpdateDensity?: (gridStyle: EuiDataGridStyle) => void;
}

export const useDensity = ({ storage, consumer, onUpdateDensity }: UseDensityProps) => {
  const [density, setDensity] = useState<EuiDataGridStyle>(
    storage.get(`${consumer}:dataGridStyle`) ?? GRID_STYLE
  );

  const onChangeDensity = useCallback(
    (newDensity: EuiDataGridStyle) => {
      setDensity(newDensity);
      storage.set(`${consumer}:dataGridStyle`, newDensity);
      onUpdateDensity?.(newDensity);
    },
    [consumer, storage, onUpdateDensity]
  );

  return {
    density,
    onChangeDensity,
  };
};
