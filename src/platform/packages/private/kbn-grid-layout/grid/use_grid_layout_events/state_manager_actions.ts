/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { cloneDeep } from 'lodash';
import deepEqual from 'fast-deep-equal';
import { MutableRefObject } from 'react';
import { GridLayoutStateManager, GridPanelData } from '../types';
import { getDragPreviewRect, getPointerOffsets, getResizePreviewRect } from './pointer_event_utils';
import { resolveGridRow } from '../utils/resolve_grid_row';
import { isGridDataEqual } from '../utils/equality_checks';
import { UserInteractionEvent } from './types';

export const startAction = (
  e: UserInteractionEvent,
  gridLayoutStateManager: GridLayoutStateManager,
  type: 'drag' | 'resize',
  rowIndex: number,
  panelId: string
) => {
  const panelRef = gridLayoutStateManager.panelRefs.current[rowIndex][panelId];
  if (!panelRef) return;

  const panelRect = panelRef.getBoundingClientRect();

  gridLayoutStateManager.interactionEvent$.next({
    type,
    id: panelId,
    panelDiv: panelRef,
    targetRowIndex: rowIndex,
    pointerOffsets: getPointerOffsets(e, panelRect),
  });

  gridLayoutStateManager.proposedGridLayout$.next(gridLayoutStateManager.gridLayout$.value);
};

export const commitAction = ({
  activePanel$,
  interactionEvent$,
  gridLayout$,
  proposedGridLayout$,
}: GridLayoutStateManager) => {
  activePanel$.next(undefined);
  interactionEvent$.next(undefined);
  const proposedGridLayoutValue = proposedGridLayout$.getValue();
  if (proposedGridLayoutValue && !deepEqual(proposedGridLayoutValue, gridLayout$.getValue())) {
    gridLayout$.next(cloneDeep(proposedGridLayoutValue));
  }
  proposedGridLayout$.next(undefined);
};

export const moveAction = (
  gridLayoutStateManager: GridLayoutStateManager,
  pointerPixel: { clientX: number; clientY: number },
  lastRequestedPanelPosition: MutableRefObject<GridPanelData | undefined>
) => {
  const {
    runtimeSettings$: { value: runtimeSettings },
    interactionEvent$,
    proposedGridLayout$,
    activePanel$,
    rowRefs: { current: gridRowElements },
  } = gridLayoutStateManager;
  const interactionEvent = interactionEvent$.value;
  if (!interactionEvent || !runtimeSettings || !gridRowElements) {
    // if no interaction event return early
    return;
  }

  const currentLayout = proposedGridLayout$.value;

  const currentPanelData =
    currentLayout?.[interactionEvent.targetRowIndex].panels[interactionEvent.id];

  if (!currentPanelData) {
    return;
  }

  const isResize = interactionEvent.type === 'resize';

  const previewRect = (() => {
    return isResize
      ? getResizePreviewRect({
          interactionEvent,
          pointerPixel,
        })
      : getDragPreviewRect({
          interactionEvent,
          pointerPixel,
        });
  })();

  activePanel$.next({ id: interactionEvent.id, position: previewRect });

  const { columnCount, gutterSize, rowHeight, columnPixelWidth } = runtimeSettings;

  // find the grid that the preview rect is over
  const lastRowIndex = interactionEvent.targetRowIndex;
  const targetRowIndex = (() => {
    if (isResize) return lastRowIndex;
    const previewBottom = previewRect.top + rowHeight;

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
  const targetedGridRow = gridRowElements[targetRowIndex];
  const targetedGridLeft = targetedGridRow?.getBoundingClientRect().left ?? 0;
  const targetedGridTop = targetedGridRow?.getBoundingClientRect().top ?? 0;

  const maxColumn = isResize ? columnCount : columnCount - currentPanelData.width;

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

  const requestedPanelData = { ...currentPanelData };
  if (isResize) {
    requestedPanelData.width = Math.max(targetColumn - requestedPanelData.column, 1);
    requestedPanelData.height = Math.max(targetRow - requestedPanelData.row, 1);
  } else {
    requestedPanelData.column = targetColumn;
    requestedPanelData.row = targetRow;
  }

  // resolve the new grid layout
  if (
    hasChangedGridRow ||
    !isGridDataEqual(requestedPanelData, lastRequestedPanelPosition.current)
  ) {
    lastRequestedPanelPosition.current = { ...requestedPanelData };

    // remove the panel from the row it's currently in.
    const nextLayout = currentLayout.map((row) => {
      const { [interactionEvent.id]: interactingPanel, ...otherPanels } = row.panels;
      return { ...row, panels: { ...otherPanels } };
    });

    // resolve destination grid
    const destinationGrid = nextLayout[targetRowIndex];
    const resolvedDestinationGrid = resolveGridRow(destinationGrid, requestedPanelData);
    nextLayout[targetRowIndex] = resolvedDestinationGrid;

    // resolve origin grid
    if (hasChangedGridRow) {
      const originGrid = nextLayout[lastRowIndex];
      const resolvedOriginGrid = resolveGridRow(originGrid);
      nextLayout[lastRowIndex] = resolvedOriginGrid;
    }
    if (!deepEqual(currentLayout, nextLayout)) {
      proposedGridLayout$.next(nextLayout);
    }
  }
};
