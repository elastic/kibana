/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useState } from 'react';
import { combineLatest, map, pairwise } from 'rxjs';

import { GridPanelDragPreview } from '../grid_panel/grid_panel_drag_preview';
import { GridPanel } from '../grid_panel';
import { useGridLayoutContext } from '../use_grid_layout_context';
import { GridRowHeader } from './grid_row_header';
import { getPanelKeysInOrder } from '../utils/resolve_grid_row';

export interface GridRowProps {
  rowId: string;
  toggleIsCollapsed;
}

export const GridRow = React.memo(({ rowId, toggleIsCollapsed }: GridRowProps) => {
  const { gridLayoutStateManager } = useGridLayoutContext();
  const currentRow = gridLayoutStateManager.gridLayout$.value[rowId];

  const [panelIdsInOrder, setPanelIdsInOrder] = useState<string[]>(() =>
    getPanelKeysInOrder(currentRow.panels)
  );
  const [isCollapsed, setIsCollapsed] = useState<boolean>(currentRow.isCollapsed);

  useEffect(
    () => {
      /**
       * This subscription ensures that the row will re-render when one of the following changes:
       * - Collapsed state
       * - Panel IDs (adding/removing/replacing, but not reordering)
       */
      const rowStateSubscription = combineLatest([
        gridLayoutStateManager.proposedGridLayout$,
        gridLayoutStateManager.gridLayout$,
      ])
        .pipe(
          map(([proposedGridLayout, gridLayout]) => {
            const displayedGridLayout = proposedGridLayout ?? gridLayout;
            return {
              isCollapsed: displayedGridLayout[rowId]?.isCollapsed ?? false,
              panelIds: Object.keys(displayedGridLayout[rowId]?.panels ?? {}),
            };
          }),
          pairwise()
        )
        .subscribe(([oldRowData, newRowData]) => {
          if (oldRowData.isCollapsed !== newRowData.isCollapsed) {
            setIsCollapsed(newRowData.isCollapsed);
          }
          if (
            oldRowData.panelIds.length !== newRowData.panelIds.length ||
            !(
              oldRowData.panelIds.every((p) => newRowData.panelIds.includes(p)) &&
              newRowData.panelIds.every((p) => oldRowData.panelIds.includes(p))
            )
          ) {
            setPanelIdsInOrder(
              getPanelKeysInOrder(
                (gridLayoutStateManager.proposedGridLayout$.getValue() ??
                  gridLayoutStateManager.gridLayout$.getValue())[rowId]?.panels ?? {}
              )
            );
          }
        });

      /**
       * Ensure the row re-renders to reflect the new panel order after a drag-and-drop interaction, since
       * the order of rendered panels need to be aligned with how they are displayed in the grid for accessibility
       * reasons (screen readers and focus management).
       */
      const gridLayoutSubscription = gridLayoutStateManager.gridLayout$.subscribe((gridLayout) => {
        if (!gridLayout[rowId]) return;
        const newPanelIdsInOrder = getPanelKeysInOrder(gridLayout[rowId].panels);
        if (panelIdsInOrder.join() !== newPanelIdsInOrder.join()) {
          setPanelIdsInOrder(newPanelIdsInOrder);
        }
      });

      return () => {
        gridLayoutSubscription.unsubscribe();
        rowStateSubscription.unsubscribe();
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rowId]
  );
  return (
    <>
      {currentRow.order !== 0 && (
        <GridRowHeader rowId={rowId} toggleIsCollapsed={toggleIsCollapsed} />
      )}
      {!isCollapsed && (
        <>
          {/* render the panels **in order** for accessibility, using the memoized panel components */}
          {panelIdsInOrder.map((panelId) => (
            <GridPanel key={panelId} panelId={panelId} rowId={rowId} />
          ))}
          <GridPanelDragPreview rowId={rowId} />
        </>
      )}
    </>
  );
});

GridRow.displayName = 'KbnGridLayoutRow';
