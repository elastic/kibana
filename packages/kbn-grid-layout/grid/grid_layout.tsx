/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useBatchedPublishingSubjects } from '@kbn/presentation-publishing';
import React, { forwardRef, useImperativeHandle } from 'react';
import { GridHeightSmoother } from './grid_height_smoother';
import { GridOverlay } from './grid_overlay';
import { GridRow } from './grid_row';
import { GridLayoutApi, GridLayoutData, GridSettings } from './types';
import { useGridLayoutEvents } from './use_grid_layout_events';
import { useGridLayoutState } from './use_grid_layout_state';
import { DEFAULT_PANEL_HEIGHT, DEFAULT_PANEL_WIDTH } from './constants';
import { runPanelPlacementStrategy } from './run_panel_placement';
import { compactGridRow } from './resolve_grid_row';

interface GridLayoutProps {
  getCreationOptions: () => { initialLayout: GridLayoutData; gridSettings: GridSettings };
  renderPanelContents: (panelId: string) => React.ReactNode;
}

export const GridLayout = forwardRef<GridLayoutApi, GridLayoutProps>(
  ({ getCreationOptions, renderPanelContents }, ref) => {
    const { gridLayoutStateManager, setDimensionsRef } = useGridLayoutState({
      getCreationOptions,
    });
    useGridLayoutEvents({ gridLayoutStateManager });

    const [gridLayout, runtimeSettings, interactionEvent] = useBatchedPublishingSubjects(
      gridLayoutStateManager.gridLayout$,
      gridLayoutStateManager.runtimeSettings$,
      gridLayoutStateManager.interactionEvent$
    );

    useImperativeHandle(
      ref,
      () => {
        return {
          addNewPanel: (panelId, placementStrategy) => {
            const currentLayout = gridLayoutStateManager.gridLayout$.getValue();
            const [firstRow, ...rest] = currentLayout;
            const nextRow = runPanelPlacementStrategy(
              firstRow,
              {
                id: panelId,
                width: DEFAULT_PANEL_WIDTH,
                height: DEFAULT_PANEL_HEIGHT,
              },
              placementStrategy
            );
            gridLayoutStateManager.gridLayout$.next([nextRow, ...rest]);
          },

          removePanel: (panelId) => {
            const currentLayout = gridLayoutStateManager.gridLayout$.getValue();

            // find the row where the panel exists and delete it from the corresponding panels object
            let index = 0;
            let updatedPanels;
            for (const row of currentLayout) {
              if (Object.keys(row.panels).includes(panelId)) {
                updatedPanels = { ...row.panels };
                delete updatedPanels[panelId];
                break;
              }
              index++;
            }

            // if the panels were updated (i.e. the panel was successfully found and deleted), update the layout
            if (updatedPanels) {
              const newLayout = [...currentLayout];
              newLayout[index] = compactGridRow({
                ...newLayout[index],
                panels: updatedPanels,
              });
              gridLayoutStateManager.gridLayout$.next(newLayout);
            }
          },

          getPanelCount: () => {
            return gridLayoutStateManager.gridLayout$.getValue().reduce((prev, row) => {
              return prev + Object.keys(row.panels).length;
            }, 0);
          },
        };
      },
      [gridLayoutStateManager.gridLayout$]
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
                  activePanelId={interactionEvent?.id}
                  renderPanelContents={renderPanelContents}
                  targetRowIndex={interactionEvent?.targetRowIndex}
                  toggleIsCollapsed={() => {
                    const currentLayout = gridLayoutStateManager.gridLayout$.value;
                    currentLayout[rowIndex].isCollapsed = !currentLayout[rowIndex].isCollapsed;
                    gridLayoutStateManager.gridLayout$.next(currentLayout);
                  }}
                  setInteractionEvent={(nextInteractionEvent) => {
                    if (!nextInteractionEvent) {
                      gridLayoutStateManager.hideDragPreview();
                    }
                    gridLayoutStateManager.interactionEvent$.next(nextInteractionEvent);
                  }}
                  ref={(element) => (gridLayoutStateManager.rowRefs.current[rowIndex] = element)}
                />
              );
            })}
          </div>
        </GridHeightSmoother>
        <GridOverlay
          interactionEvent={interactionEvent}
          gridLayoutStateManager={gridLayoutStateManager}
        />
      </>
    );
  }
);
