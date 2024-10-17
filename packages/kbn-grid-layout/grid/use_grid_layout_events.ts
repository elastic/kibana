/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useRef } from 'react';
import { combineLatest } from 'rxjs';

import { resolveGridRow } from './resolve_grid_row';
import { GridLayoutStateManager, GridPanelData } from './types';

export const isGridDataEqual = (a?: GridPanelData, b?: GridPanelData) => {
  return (
    a?.id === b?.id &&
    a?.column === b?.column &&
    a?.row === b?.row &&
    a?.width === b?.width &&
    a?.height === b?.height
  );
};

export const useGridLayoutEvents = ({
  gridLayoutStateManager,
}: {
  gridLayoutStateManager: GridLayoutStateManager;
}) => {
  const mouseClientPosition = useRef({ x: 0, y: 0 });
  const lastRequestedPanelPosition = useRef<GridPanelData | undefined>(undefined);

  // -----------------------------------------------------------------------------------------
  // Set up drag events
  // -----------------------------------------------------------------------------------------
  useEffect(() => {
    const { runtimeSettings$, interactionEvent$, gridLayout$ } = gridLayoutStateManager;
    const calculateUserEvent = (e: Event) => {
      if (!interactionEvent$.value || interactionEvent$.value.type === 'drop') return;
      e.preventDefault();
      e.stopPropagation();

      const gridRowElements = gridLayoutStateManager.rowRefs.current;
      // const previewElement = gridLayoutStateManager.dragPreviewRef.current;

      const interactionEvent = interactionEvent$.value;
      const isResize = interactionEvent?.type === 'resize';

      const currentLayout = gridLayout$.value;
      const currentGridData = (() => {
        if (!interactionEvent) return;
        for (const row of currentLayout) {
          if (row.panels[interactionEvent.id]) return row.panels[interactionEvent.id];
        }
      })();

      if (!runtimeSettings$.value || !gridRowElements || !currentGridData) {
        return;
      }

      const mouseTargetPixel = {
        x: mouseClientPosition.current.x,
        y: mouseClientPosition.current.y,
      };
      const panelRect = interactionEvent.panelDiv.getBoundingClientRect();
      const previewRect = {
        left: isResize ? panelRect.left : mouseTargetPixel.x - interactionEvent.mouseOffsets.left,
        top: isResize ? panelRect.top : mouseTargetPixel.y - interactionEvent.mouseOffsets.top,
        bottom: mouseTargetPixel.y - interactionEvent.mouseOffsets.bottom,
        right: mouseTargetPixel.x - interactionEvent.mouseOffsets.right,
      };
      gridLayoutStateManager.draggingPosition$.next(previewRect);

      // find the grid that the preview rect is over
      const previewBottom =
        previewRect.top + gridLayoutStateManager.runtimeSettings$.value.rowHeight;
      const lastRowIndex = interactionEvent?.targetRowIndex;
      const targetRowIndex = (() => {
        if (isResize) return lastRowIndex;

        let highestOverlap = -Infinity;
        let highestOverlapRowIndex = -1;
        gridRowElements.forEach((row, index) => {
          if (!row) return;
          const rowRect = row.getBoundingClientRect();
          const overlap =
            Math.min(previewBottom, rowRect.bottom) - Math.max(previewRect.top, rowRect.top);
          if (overlap > highestOverlap) {
            highestOverlap = overlap;
            highestOverlapRowIndex = index;
          }
        });
        return highestOverlapRowIndex;
      })();
      const hasChangedGridRow = targetRowIndex !== lastRowIndex;

      // re-render when the target row changes
      if (hasChangedGridRow) {
        interactionEvent$.next({
          ...interactionEvent,
          targetRowIndex,
        });
      }

      // calculate the requested grid position
      const { columnCount, gutterSize, rowHeight, columnPixelWidth } = runtimeSettings$.value;
      const targetedGridRow = gridRowElements[targetRowIndex];
      const targetedGridLeft = targetedGridRow?.getBoundingClientRect().left ?? 0;
      const targetedGridTop = targetedGridRow?.getBoundingClientRect().top ?? 0;

      const maxColumn = isResize ? columnCount : columnCount - currentGridData.width;

      const localXCoordinate = isResize
        ? previewRect.right - targetedGridLeft
        : previewRect.left - targetedGridLeft;
      const localYCoordinate = isResize
        ? previewRect.bottom - targetedGridTop
        : previewRect.top - targetedGridTop;

      // gridLayoutStateManager.updateDragPreview(previewRect);

      const targetColumn = Math.min(
        Math.max(Math.round(localXCoordinate / (columnPixelWidth + gutterSize)), 0),
        maxColumn
      );
      const targetRow = Math.max(Math.round(localYCoordinate / (rowHeight + gutterSize)), 0);
      const requestedGridData = { ...currentGridData };
      if (isResize) {
        requestedGridData.width = Math.max(targetColumn - requestedGridData.column, 1);
        requestedGridData.height = Math.max(targetRow - requestedGridData.row, 1);
      } else {
        requestedGridData.column = targetColumn;
        requestedGridData.row = targetRow;
      }

      // resolve the new grid layout
      if (
        hasChangedGridRow ||
        !isGridDataEqual(requestedGridData, lastRequestedPanelPosition.current)
      ) {
        lastRequestedPanelPosition.current = { ...requestedGridData };

        // remove the panel from the row it's currently in.
        const nextLayout = currentLayout.map((row, rowIndex) => {
          const { [interactionEvent.id]: interactingPanel, ...otherPanels } = row.panels;
          return { ...row, panels: { ...otherPanels } };
        });

        // resolve destination grid
        const destinationGrid = nextLayout[targetRowIndex];
        const resolvedDestinationGrid = resolveGridRow(destinationGrid, requestedGridData);
        nextLayout[targetRowIndex] = resolvedDestinationGrid;

        // resolve origin grid
        if (hasChangedGridRow) {
          // debugger;
          const originGrid = nextLayout[lastRowIndex];
          const resolvedOriginGrid = resolveGridRow(originGrid);
          nextLayout[lastRowIndex] = resolvedOriginGrid;
        }

        gridLayout$.next(nextLayout);
      }
    };

    /**
     * On layout change, update the styles of every panel so that it renders as expected
     */
    const onLayoutChangeSubscription = combineLatest([
      gridLayoutStateManager.gridLayout$,
      gridLayoutStateManager.draggingPosition$,
    ]).subscribe(([gridLayout, draggingPosition]) => {
      const event = interactionEvent$.getValue();
      gridLayout.forEach((currentRow, rowIndex) => {
        Object.keys(currentRow.panels).forEach((key) => {
          const panel = currentRow.panels[key];
          const panelRef = gridLayoutStateManager.panelRefs.current[rowIndex][key];
          if (!panelRef) return;

          if (panel.id === event?.id && draggingPosition) {
            // if the current panel is being dragged, render it with a fixed position
            panelRef.style.position = 'fixed';
            panelRef.style.left = `${draggingPosition.left}px`;
            panelRef.style.top = `${draggingPosition.top}px`;
            panelRef.style.width = `${draggingPosition.right - draggingPosition.left}px`;
            panelRef.style.height = `${draggingPosition.bottom - draggingPosition.top}px`;

            // undo any "lock to grid" styles
            panelRef.style.gridColumnStart = ``;
            panelRef.style.gridColumnEnd = ``;
            panelRef.style.gridRowStart = ``;
            panelRef.style.gridRowEnd = ``;

            if (gridLayoutStateManager.dragPreviewRef.current) {
              // update the position of the drag preview
              gridLayoutStateManager.dragPreviewRef.current.style.gridColumnStart = `${
                panel.column + 1
              }`;
              gridLayoutStateManager.dragPreviewRef.current.style.gridColumnEnd = `${
                panel.column + 1 + panel.width
              }`;
              gridLayoutStateManager.dragPreviewRef.current.style.gridRowStart = `${panel.row + 1}`;
              gridLayoutStateManager.dragPreviewRef.current.style.gridRowEnd = `${
                panel.row + 1 + panel.height
              }`;
            }
          } else {
            // if the panel is not being dragged, undo any dragging styles
            panelRef.style.position = '';
            panelRef.style.left = ``;
            panelRef.style.top = ``;
            panelRef.style.width = ``;
            panelRef.style.height = ``;

            // and render the panel locked to the grid
            panelRef.style.gridColumnStart = `${panel.column + 1}`;
            panelRef.style.gridColumnEnd = `${panel.column + 1 + panel.width}`;
            panelRef.style.gridRowStart = `${panel.row + 1}`;
            panelRef.style.gridRowEnd = `${panel.row + 1 + panel.height}`;
          }
        });
      });
    });

    const onMouseMove = (e: MouseEvent) => {
      mouseClientPosition.current = { x: e.clientX, y: e.clientY };
      calculateUserEvent(e);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('scroll', calculateUserEvent);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('scroll', calculateUserEvent);

      onLayoutChangeSubscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
};
