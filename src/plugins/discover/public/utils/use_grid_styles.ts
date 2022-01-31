/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useMemo, useState } from 'react';
import { EuiDataGridStyle } from '@elastic/eui';
import { DENSITY_STYLES, GRID_STYLE } from '../components/discover_grid/constants';
import { useDiscoverServices } from './use_discover_services';
import { getStoredRowDensity, RowDensity, updateStoredDensity } from './row_density';

const convertGridStylesToSelection = (gridStyles: EuiDataGridStyle): RowDensity => {
  if (gridStyles.fontSize === 's' && gridStyles.cellPadding === 's') return 'compact';
  if (gridStyles.fontSize === 'm' && gridStyles.cellPadding === 'm') return 'normal';
  if (gridStyles.fontSize === 'l' && gridStyles.cellPadding === 'l') return 'expanded';
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

export const useGridStyles = ({
  rowDensityState,
  onUpdateDensity,
}: {
  rowDensityState?: string;
  onUpdateDensity?: (density: string) => void;
}) => {
  const { storage } = useDiscoverServices();

  const initialRowDensity = useMemo(
    () => (rowDensityState as RowDensity) || getStoredRowDensity(storage),
    [rowDensityState, storage]
  );

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
        onUpdateDensity?.(newRowDensity);
        updateStoredDensity(newRowDensity, storage);
        setGridDensityClass(chooseDensityClass(newRowDensity));
      },
    };
  }, [initialRowDensity, onUpdateDensity, storage]);

  return { gridStyle, gridDensityClass };
};
