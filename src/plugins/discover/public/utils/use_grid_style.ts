/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useMemo, useState } from 'react';
import { EuiDataGridStyle } from '@elastic/eui';
import { getServices } from '../kibana_services';
import { Storage } from '../../../kibana_utils/public';
import { DENSITY_STYLES, GRID_STYLE } from '../components/discover_grid/constants';

type RowDensity = 'compact' | 'normal' | 'expanded';

const DENSITY_KEY = 'discover:dataGridRowDensity';
const ROW_DENSITY = ['compact', 'normal', 'expanded'];

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

const chooseDensityClass = (initialRowDensity: RowDensity | null): string | null => {
  let densityClass = null;
  if (initialRowDensity === 'normal') {
    densityClass = 'normalDensityGrid';
  } else if (initialRowDensity === 'expanded') {
    densityClass = 'expandedDensityGrid';
  }
  return densityClass;
};

export const useGridStyle = () => {
  const { storage } = getServices();

  const initialRowDensity = useMemo(() => getStoredRowDensity(storage), [storage]);

  const [gridDensityClass, setGridDensityClass] = useState<string | null>(
    chooseDensityClass(initialRowDensity)
  );

  const gridStyle: EuiDataGridStyle = useMemo(() => {
    const overridingStyles =
      initialRowDensity !== null ? DENSITY_STYLES[initialRowDensity] : DENSITY_STYLES.normal;

    return {
      ...GRID_STYLE,
      ...overridingStyles,
      onChange: (newStyles) => {
        const newRowDensity = convertGridStylesToSelection(newStyles);
        storage.set(DENSITY_KEY, newRowDensity);
        setGridDensityClass(chooseDensityClass(newRowDensity));
      },
    };
  }, [storage, initialRowDensity]);

  return { gridStyle, gridDensityClass };
};
