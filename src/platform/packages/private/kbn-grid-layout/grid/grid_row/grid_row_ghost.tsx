/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import React, { useEffect } from 'react';
import { combineLatest } from 'rxjs';

import { useGridLayoutContext } from '../use_grid_layout_context';
import { getTopOffsetForRowFooter } from '../utils/calculations';

export const GridRowEndMark = ({ rowId }: { rowId: string }) => {
  const { gridLayoutStateManager } = useGridLayoutContext();
  const styles = {
    pointerEvents: 'none' as const,
    height: '0px',
  };

  useEffect(
    () => {
      /** Update the styles of the drag preview via a subscription to prevent re-renders */
      const styleSubscription = combineLatest([
        gridLayoutStateManager.gridLayout$,
        gridLayoutStateManager.proposedGridLayout$,
      ]).subscribe(([gridLayout, proposedGridLayout]) => {
        const elRef = gridLayoutStateManager.rowEndMarkRefs.current[rowId];
        if (!elRef) return;
        const currentGridLayout = proposedGridLayout || gridLayout;
        const topOffset = getTopOffsetForRowFooter(rowId, currentGridLayout);
        elRef.style.display = 'block';
        elRef.style.gridColumnStart = `1`;
        elRef.style.gridColumnEnd = `-1`;
        elRef.style.gridRowStart = `${topOffset + 1}`;
        elRef.style.gridRowEnd = `${topOffset + 1}`;
      });

      return () => {
        styleSubscription.unsubscribe();
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  return (
    <div
      style={styles}
      className="kbnGridRowFooter--ghost"
      ref={(element: HTMLDivElement | null) =>
        (gridLayoutStateManager.rowEndMarkRefs.current[rowId] = element)
      }
    /> // this is used only for calculating the position of the row
  );
};
