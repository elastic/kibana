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
import { getDragPreviewRect, getResizePreviewRect } from './pointer_event_utils';
import { resolveGridRow } from '../utils/resolve_grid_row';
import { isGridDataEqual } from '../utils/equality_checks';
import { UserInteractionEvent } from './types';
import { getPointerPosition } from './sensors';

export const startAction = (
  e: UserInteractionEvent,
  gridLayoutStateManager: GridLayoutStateManager,
  type: 'drag' | 'resize',
  rowId: string,
  panelId: string,
  startingMouse: MutableRefObject<{
    x: number;
    y: number;
  }>
) => {
  const panelRef = gridLayoutStateManager.panelRefs.current[rowId][panelId];
  if (!panelRef) return;

  const panelRect = panelRef.getBoundingClientRect();

  const { clientX, clientY } = getPointerPosition(e);
  startingMouse.current = { x: clientX, y: clientY };

  gridLayoutStateManager.interactionEvent$.next({
    type,
    id: panelId,
    targetRow: rowId,
    panelDiv: panelRef,
    startingRect: panelRect,
    // start with no translations
    translateRect: {
      top: 0,
      left: 0,
      width: 0,
      height: 0,
    },
  });
  gridLayoutStateManager.proposedGridLayout$.next(gridLayoutStateManager.gridLayout$.value);
};

export const commitAction = ({
  interactionEvent$,
  gridLayout$,
  proposedGridLayout$,
}: GridLayoutStateManager) => {
  interactionEvent$.next(undefined);
  const proposedGridLayoutValue = proposedGridLayout$.getValue();
  if (proposedGridLayoutValue && !deepEqual(proposedGridLayoutValue, gridLayout$.getValue())) {
    gridLayout$.next(cloneDeep(proposedGridLayoutValue));
  }
  proposedGridLayout$.next(undefined);
};

export const moveAction = (
  type: 'drag' | 'resize',
  gridLayoutStateManager: GridLayoutStateManager,
  pointerPixel: { clientX: number; clientY: number },
  lastRequestedPanelPosition: MutableRefObject<GridPanelData | undefined>,
  startingMouse: MutableRefObject<{
    x: number;
    y: number;
  }>
) => {
  const {
    runtimeSettings$: { value: runtimeSettings },
    interactionEvent$,
    proposedGridLayout$,
    rowRefs: { current: gridRowElements },
  } = gridLayoutStateManager;
  const interactionEvent = interactionEvent$.value;
  if (!interactionEvent || !runtimeSettings || !gridRowElements) {
    // if no interaction event return early
    return;
  }
  const currentLayout = proposedGridLayout$.value;
  const currentPanelData = currentLayout?.[interactionEvent.targetRow].panels[interactionEvent.id];
  if (!currentPanelData) {
    return;
  }

  // calculate the translation between th starting mouse position and the current one
  const translate = {
    x: pointerPixel.clientX - startingMouse.current.x,
    y: pointerPixel.clientY - startingMouse.current.y,
  };
  const isResize = interactionEvent.type === 'resize';
  const previewRect = (() => {
    return isResize
      ? getResizePreviewRect({
          interactionEvent,
          translate,
        })
      : getDragPreviewRect({
          interactionEvent,
          translate,
        });
  })();

  const { columnCount, gutterSize, rowHeight, columnPixelWidth } = runtimeSettings;

  // find the grid that the preview rect is over
  const lastRowId = interactionEvent.targetRow;
  const targetRowId = (() => {
    if (isResize) return lastRowId;
    const previewBottom = previewRect.top + rowHeight;

    let highestOverlap = -Infinity;
    let highestOverlapRowId = '';
    Object.entries(gridRowElements).forEach(([id, row]) => {
      if (!row) return;
      const rowRect = row.getBoundingClientRect();
      const overlap =
        Math.min(previewBottom, rowRect.bottom) - Math.max(previewRect.top, rowRect.top);
      if (overlap > highestOverlap) {
        highestOverlap = overlap;
        highestOverlapRowId = id;
      }
    });
    return highestOverlapRowId;
  })();

  // trigger an updated interaction event now that we now which grid row is being targetted
  interactionEvent$.next({
    ...interactionEvent,
    type,
    targetRow: targetRowId,
    // resize events only mutate width + height; drag events only mutate top + left
    translateRect: {
      top: isResize ? 0 : translate.y,
      left: isResize ? 0 : translate.x,
      width: isResize ? translate.x : 0,
      height: isResize ? translate.y : 0,
    },
  });

  // calculate the requested grid position
  const hasChangedGridRow = targetRowId !== lastRowId;
  const targetedGridRow = gridRowElements[targetRowId];
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
    const nextLayout = cloneDeep(currentLayout);
    Object.entries(nextLayout).forEach(([rowId, row]) => {
      const { [interactionEvent.id]: interactingPanel, ...otherPanels } = row.panels;
      nextLayout[rowId] = { ...row, panels: { ...otherPanels } };
    });

    // resolve destination grid
    const destinationGrid = nextLayout[targetRowId];
    const resolvedDestinationGrid = resolveGridRow(destinationGrid, requestedPanelData);
    nextLayout[targetRowId] = resolvedDestinationGrid;

    // resolve origin grid
    if (hasChangedGridRow) {
      const originGrid = nextLayout[lastRowId];
      const resolvedOriginGrid = resolveGridRow(originGrid);
      nextLayout[lastRowId] = resolvedOriginGrid;
    }
    if (!deepEqual(currentLayout, nextLayout)) {
      proposedGridLayout$.next(nextLayout);
    }
  }
};
