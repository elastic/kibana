/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { cloneDeep } from 'lodash';
import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { combineLatest, distinctUntilChanged, filter, map, pairwise, skip } from 'rxjs';

import { GridHeightSmoother } from './grid_height_smoother';
import { GridRow } from './grid_row';
import { GridLayoutApi, GridLayoutData, GridSettings } from './types';
import { useGridLayoutApi } from './use_grid_layout_api';
import { useGridLayoutEvents } from './use_grid_layout_events';
import { useGridLayoutState } from './use_grid_layout_state';
import { isLayoutEqual } from './utils/equality_checks';

interface GridLayoutProps {
  getCreationOptions: () => { initialLayout: GridLayoutData; gridSettings: GridSettings };
  renderPanelContents: (panelId: string) => React.ReactNode;
  onLayoutChange: (newLayout: GridLayoutData) => void;
}

export const GridLayout = forwardRef<GridLayoutApi, GridLayoutProps>(
  ({ getCreationOptions, renderPanelContents, onLayoutChange }, ref) => {
    const { gridLayoutStateManager, setDimensionsRef } = useGridLayoutState({
      getCreationOptions,
    });
    useGridLayoutEvents({ gridLayoutStateManager });

    const gridLayoutApi = useGridLayoutApi({ gridLayoutStateManager });
    useImperativeHandle(ref, () => gridLayoutApi, [gridLayoutApi]);

    const [rowCount, setRowCount] = useState<number>(
      gridLayoutStateManager.gridLayout$.getValue().length
    );

    useEffect(() => {
      /**
       * The only thing that should cause the entire layout to re-render is adding a new row;
       * this subscription ensures this by updating the `rowCount` state when it changes.
       */
      const rowCountSubscription = gridLayoutStateManager.gridLayout$
        .pipe(
          skip(1), // we initialized `rowCount` above, so skip the initial emit
          map((newLayout) => newLayout.length),
          distinctUntilChanged()
        )
        .subscribe((newRowCount) => {
          setRowCount(newRowCount);
        });

      const onLayoutChangeSubscription = combineLatest([
        gridLayoutStateManager.gridLayout$,
        gridLayoutStateManager.interactionEvent$,
      ])
        .pipe(
          // if an interaction event is happening, then ignore any "draft" layout changes
          filter(([_, event]) => !Boolean(event)),
          // once no interaction event, create pairs of "old" and "new" layouts for comparison
          map(([layout]) => layout),
          pairwise()
        )
        .subscribe(([layoutBefore, layoutAfter]) => {
          if (!isLayoutEqual(layoutBefore, layoutAfter)) {
            onLayoutChange(layoutAfter);
          }
        });

      return () => {
        rowCountSubscription.unsubscribe();
        onLayoutChangeSubscription.unsubscribe();
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
      <>
        <GridHeightSmoother gridLayoutStateManager={gridLayoutStateManager}>
          <div
            ref={(divElement) => {
              setDimensionsRef(divElement);
            }}
          >
            {Array.from({ length: rowCount }, (_, rowIndex) => {
              return (
                <GridRow
                  key={rowIndex}
                  rowIndex={rowIndex}
                  renderPanelContents={renderPanelContents}
                  gridLayoutStateManager={gridLayoutStateManager}
                  toggleIsCollapsed={() => {
                    const newLayout = cloneDeep(gridLayoutStateManager.gridLayout$.value);
                    newLayout[rowIndex].isCollapsed = !newLayout[rowIndex].isCollapsed;
                    gridLayoutStateManager.gridLayout$.next(newLayout);
                  }}
                  setInteractionEvent={(nextInteractionEvent) => {
                    if (!nextInteractionEvent) {
                      gridLayoutStateManager.activePanel$.next(undefined);
                    }
                    gridLayoutStateManager.interactionEvent$.next(nextInteractionEvent);
                  }}
                  ref={(element) => (gridLayoutStateManager.rowRefs.current[rowIndex] = element)}
                />
              );
            })}
          </div>
        </GridHeightSmoother>
      </>
    );
  }
);
