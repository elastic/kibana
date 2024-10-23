/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useState } from 'react';
import { distinctUntilChanged, map, skip } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';

import { GridHeightSmoother } from './grid_height_smoother';
import { GridRow } from './grid_row';
import { GridLayoutData, GridSettings } from './types';
import { useGridLayoutEvents } from './use_grid_layout_events';
import { useGridLayoutState } from './use_grid_layout_state';

export const GridLayout = ({
  getCreationOptions,
  renderPanelContents,
}: {
  getCreationOptions: () => { initialLayout: GridLayoutData; gridSettings: GridSettings };
  renderPanelContents: (panelId: string) => React.ReactNode;
}) => {
  const { gridLayoutStateManager, setDimensionsRef } = useGridLayoutState({
    getCreationOptions,
  });
  useGridLayoutEvents({ gridLayoutStateManager });

  const [rowCount, setRowCount] = useState<number>(
    gridLayoutStateManager.gridLayout$.getValue().length
  );

  useEffect(() => {
    const rowCountSubscription = gridLayoutStateManager.gridLayout$
      .pipe(
        skip(1),
        map((newLayout) => newLayout.length),
        distinctUntilChanged()
      )
      .subscribe((newRowCount) => {
        setRowCount(newRowCount);
      });
    return () => rowCountSubscription.unsubscribe();
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
          {Array.from({ length: rowCount }).map((_, rowIndex) => {
            return (
              <GridRow
                key={uuidv4()}
                rowIndex={rowIndex}
                renderPanelContents={renderPanelContents}
                gridLayoutStateManager={gridLayoutStateManager}
                toggleIsCollapsed={() => {
                  const currentLayout = gridLayoutStateManager.gridLayout$.value;
                  currentLayout[rowIndex].isCollapsed = !currentLayout[rowIndex].isCollapsed;
                  gridLayoutStateManager.gridLayout$.next(currentLayout);
                  const currentRow = currentLayout[rowIndex];
                  gridLayoutStateManager.rows$[rowIndex].next({
                    title: currentRow.title,
                    isCollapsed: currentRow.isCollapsed,
                    panelIds: Object.keys(currentRow.panels),
                  });
                }}
                setInteractionEvent={(nextInteractionEvent) => {
                  if (nextInteractionEvent?.type === 'drop') {
                    gridLayoutStateManager.activePanel$.next(undefined);
                    gridLayoutStateManager.interactionEvent$.next(undefined);
                  } else {
                    gridLayoutStateManager.interactionEvent$.next(nextInteractionEvent);
                  }
                }}
                ref={(element) => (gridLayoutStateManager.rowRefs.current[rowIndex] = element)}
              />
            );
          })}
        </div>
      </GridHeightSmoother>
    </>
  );
};
