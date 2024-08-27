/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useEffect, useRef } from 'react';
import { resolveGridRow } from './resolve_grid_row';
import { GridPanelData, GridLayoutStateManager } from './types';

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
  const dragEnterCount = useRef(0);
  const lastRequestedPanelPosition = useRef<GridPanelData | undefined>(undefined);

  // -----------------------------------------------------------------------------------------
  // Set up drag events
  // -----------------------------------------------------------------------------------------
  useEffect(() => {
    const { runtimeSettings$, interactionEvent$, gridLayout$ } = gridLayoutStateManager;
    const dragOver = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const gridRowElements = gridLayoutStateManager.rowRefs.current;
      const previewElement = gridLayoutStateManager.dragPreviewRef.current;

      const interactionEvent = interactionEvent$.value;
      const isResize = interactionEvent?.type === 'resize';

      const currentLayout = gridLayout$.value;
      const currentGridData = (() => {
        if (!interactionEvent) return;
        for (const row of currentLayout) {
          if (row.panels[interactionEvent.id]) return row.panels[interactionEvent.id];
        }
      })();

      if (
        !runtimeSettings$.value ||
        !interactionEvent ||
        !previewElement ||
        !gridRowElements ||
        !currentGridData
      ) {
        return;
      }

      const mouseTargetPixel = { x: e.clientX, y: e.clientY };
      const panelRect = interactionEvent.panelDiv.getBoundingClientRect();
      const previewRect = {
        left: isResize ? panelRect.left : mouseTargetPixel.x - interactionEvent.mouseOffsets.left,
        top: isResize ? panelRect.top : mouseTargetPixel.y - interactionEvent.mouseOffsets.top,
        bottom: mouseTargetPixel.y - interactionEvent.mouseOffsets.bottom,
        right: mouseTargetPixel.x - interactionEvent.mouseOffsets.right,
      };
      gridLayoutStateManager.updatePreviewElement(previewRect);

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
          const originGrid = nextLayout[lastRowIndex];
          const resolvedOriginGrid = resolveGridRow(originGrid);
          nextLayout[lastRowIndex] = resolvedOriginGrid;
        }
        gridLayout$.next(nextLayout);
      }
    };

    const onDrop = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!interactionEvent$.value) return;

      interactionEvent$.next(undefined);
      gridLayoutStateManager.hideDragPreview();
      dragEnterCount.current = 0;
    };

    const onDragEnter = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!interactionEvent$.value) return;

      dragEnterCount.current++;
    };

    const onDragLeave = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!interactionEvent$.value) return;

      dragEnterCount.current--;
      if (dragEnterCount.current === 0) {
        interactionEvent$.next(undefined);
        gridLayoutStateManager.hideDragPreview();
        dragEnterCount.current = 0;
      }
    };

    window.addEventListener('drop', onDrop);
    window.addEventListener('dragover', dragOver);
    window.addEventListener('dragenter', onDragEnter);
    window.addEventListener('dragleave', onDragLeave);
    return () => {
      window.removeEventListener('drop', dragOver);
      window.removeEventListener('dragover', dragOver);
      window.removeEventListener('dragenter', onDragEnter);
      window.removeEventListener('dragleave', onDragLeave);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
};
