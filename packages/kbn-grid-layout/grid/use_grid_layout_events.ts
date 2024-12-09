/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import deepEqual from 'fast-deep-equal';
import { useEffect, useRef } from 'react';
import { resolveGridRow } from './utils/resolve_grid_row';
import { GridPanelData, GridLayoutStateManager } from './types';
import { isGridDataEqual } from './utils/equality_checks';

const scrollOnInterval = (direction: 'up' | 'down') => {
  let count = 0;
  const interval = setInterval(() => {
    // calculate the speed based on how long the interval has been going to create an ease effect
    // via the parabola formula `y = a(x - h)^2 + k`
    // - the starting speed is k = 50
    // - the maximum speed is 250
    // - the rate at which the speed increases is controlled by a = 0.75
    const speed = Math.min(0.75 * count ** 2 + 50, 250);
    window.scrollBy({ top: direction === 'down' ? speed : -speed, behavior: 'smooth' });
    count++;
  }, 100);
  return interval;
};

export const useGridLayoutEvents = ({
  gridLayoutStateManager,
}: {
  gridLayoutStateManager: GridLayoutStateManager;
}) => {
  const mouseClientPosition = useRef({ x: 0, y: 0 });
  const lastRequestedPanelPosition = useRef<GridPanelData | undefined>(undefined);
  const scrollInterval = useRef<NodeJS.Timeout | null>(null);

  // -----------------------------------------------------------------------------------------
  // Set up drag events
  // -----------------------------------------------------------------------------------------
  useEffect(() => {
    const { runtimeSettings$, interactionEvent$, gridLayout$ } = gridLayoutStateManager;

    const stopAutoScrollIfNecessary = () => {
      if (scrollInterval.current) {
        clearInterval(scrollInterval.current);
        scrollInterval.current = null;
      }
    };

    const calculateUserEvent = (e: Event) => {
      if (!interactionEvent$.value) {
        // if no interaction event, stop auto scroll (if necessary) and return early
        stopAutoScrollIfNecessary();
        return;
      }
      e.preventDefault();
      e.stopPropagation();

      const gridRowElements = gridLayoutStateManager.rowRefs.current;

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

      gridLayoutStateManager.activePanel$.next({ id: interactionEvent.id, position: previewRect });

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

      // auto scroll when an event is happening close to the top or bottom of the screen
      const heightPercentage =
        100 - ((window.innerHeight - mouseTargetPixel.y) / window.innerHeight) * 100;
      const startScrollingUp = !isResize && heightPercentage < 5; // don't scroll up when resizing
      const startScrollingDown = heightPercentage > 95;
      if (startScrollingUp || startScrollingDown) {
        if (!scrollInterval.current) {
          // only start scrolling if it's not already happening
          scrollInterval.current = scrollOnInterval(startScrollingUp ? 'up' : 'down');
        }
      } else {
        stopAutoScrollIfNecessary();
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
        if (!deepEqual(currentLayout, nextLayout)) {
          gridLayout$.next(nextLayout);
        }
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      // Note: When an item is being interacted with, `mousemove` events continue to be fired, even when the
      // mouse moves out of the window (i.e. when a panel is being dragged around outside the window).
      mouseClientPosition.current = { x: e.clientX, y: e.clientY };
      calculateUserEvent(e);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('scroll', calculateUserEvent);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('scroll', calculateUserEvent);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
};
