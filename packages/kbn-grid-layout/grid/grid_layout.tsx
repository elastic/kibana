/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import { useBatchedPublishingSubjects } from '@kbn/presentation-publishing';

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

  const [gridLayout, runtimeSettings, interactionEvent] = useBatchedPublishingSubjects(
    gridLayoutStateManager.gridLayout$,
    gridLayoutStateManager.runtimeSettings$,
    gridLayoutStateManager.interactionEvent$
  );

  return (
    <>
      <GridHeightSmoother gridLayoutStateManager={gridLayoutStateManager}>
        <div
          ref={(divElement) => {
            setDimensionsRef(divElement);
          }}
        >
          {gridLayout.map((rowData, rowIndex) => {
            return (
              <GridRow
                rowData={rowData}
                key={rowData.title}
                rowIndex={rowIndex}
                runtimeSettings={runtimeSettings}
                renderPanelContents={renderPanelContents}
                targetRowIndex={interactionEvent?.targetRowIndex}
                gridLayoutStateManager={gridLayoutStateManager}
                toggleIsCollapsed={() => {
                  const currentLayout = gridLayoutStateManager.gridLayout$.value;
                  currentLayout[rowIndex].isCollapsed = !currentLayout[rowIndex].isCollapsed;
                  gridLayoutStateManager.gridLayout$.next(currentLayout);
                }}
                setInteractionEvent={(nextInteractionEvent) => {
                  if (nextInteractionEvent?.type === 'drop') {
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
};
