/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import deepEqual from 'fast-deep-equal';
import { cloneDeep } from 'lodash';
import { MutableRefObject } from 'react';
import { v4 as uuidv4 } from 'uuid';

import { GridLayoutStateManager, GridPanelData } from '../../types';
import { isGridDataEqual } from '../../utils/equality_checks';
import { resolveGridRow } from '../../utils/resolve_grid_row';
import { getSensorType, isKeyboardEvent } from '../sensors';
import { PointerPosition, UserInteractionEvent } from '../types';
import { getDragPreviewRect, getResizePreviewRect, getSensorOffsets } from './utils';

export const startAction = (
  e: UserInteractionEvent,
  gridLayoutStateManager: GridLayoutStateManager,
  type: 'drag' | 'resize',
  rowId: string,
  panelId: string
) => {
  const panelRef = gridLayoutStateManager.panelRefs.current[panelId];
  if (!panelRef) return;

  const panelRect = panelRef.getBoundingClientRect();

  gridLayoutStateManager.interactionEvent$.next({
    type,
    id: panelId,
    panelDiv: panelRef,
    targetRow: rowId,
    sensorType: getSensorType(e),
    sensorOffsets: getSensorOffsets(e, panelRect),
  });

  gridLayoutStateManager.proposedGridLayout$.next(gridLayoutStateManager.gridLayout$.value);
};

export const moveAction = (
  e: UserInteractionEvent,
  gridLayoutStateManager: GridLayoutStateManager,
  pointerPixel: PointerPosition,
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

  const currentPanelData = currentLayout?.[interactionEvent.targetRow].panels[interactionEvent.id];

  if (!currentPanelData) {
    return;
  }

  const isResize = interactionEvent.type === 'resize';

  const previewRect = (() => {
    if (isResize) {
      const layoutRef = gridLayoutStateManager.layoutRef.current;
      const maxRight = layoutRef
        ? layoutRef.getBoundingClientRect().right - runtimeSettings.gutterSize
        : window.innerWidth;
      return getResizePreviewRect({ interactionEvent, pointerPixel, maxRight });
    } else {
      return getDragPreviewRect({ interactionEvent, pointerPixel });
    }
  })();

  activePanel$.next({ id: interactionEvent.id, position: previewRect });

  const { columnCount, gutterSize, rowHeight, columnPixelWidth } = runtimeSettings;

  // find the grid that the preview rect is over
  const lastRowId = interactionEvent.targetRow;
  let targetRowId = (() => {
    // TODO: temporary blocking of moving with keyboard between sections till we have a better way to handle keyboard events between rows
    if (isResize || isKeyboardEvent(e)) return lastRowId;
    const previewBottom = previewRect.top + rowHeight;

    let highestOverlap = -Infinity;
    let highestOverlapRowId = '';
    /**
     * by spreading the grid row + header elements like this, if a row is expanded, then its wrapping DIV takes priority
     * when calculating overlap; otherwise, use the header to calculate the target row ID
     */
    Object.entries({ ...gridLayoutStateManager.headerRefs.current, ...gridRowElements }).forEach(
      ([id, row]) => {
        if (!row) return;
        const rowRect = row.getBoundingClientRect();
        const overlap =
          Math.min(previewBottom, rowRect.bottom) - Math.max(previewRect.top, rowRect.top);
        if (overlap > highestOverlap) {
          highestOverlap = overlap;
          highestOverlapRowId = id;
        }
      }
    );
    return highestOverlapRowId;
  })();

  let shouldCreateNewRow = false;
  // let previousRow;
  let currentTargetRow = currentLayout[targetRowId];
  if (currentTargetRow.isCollapsible && currentTargetRow.isCollapsed) {
    const rowBelow = Object.values(currentLayout).find(
      (r) => r.order === currentLayout[targetRowId].order + 1
    );
    // console.log({ rowBelow });

    // // create a new, non-collapsible row
    // previousRow = targetRowId;
    // const newTargetRow = uuidv4();
    // // targetRowId = uuidv4();
    // // currentLayout[newTargetRow] = {
    // //   id: newTargetRow,
    // //   isCollapsible: false,
    // //   order: currentLayout[targetRowId].order + 1,
    // //   panels: {},
    // // };
    // targetRowId = newTargetRow;
    if (!rowBelow || rowBelow.isCollapsible) {
      shouldCreateNewRow = true;
    } else {
      targetRowId = rowBelow.id;
      currentTargetRow = currentLayout[targetRowId];
    }
  }
  // console.log({ targetRowId, lastRowId, currentLayout });

  const hasChangedGridRow = shouldCreateNewRow || targetRowId !== lastRowId;

  // calculate the requested grid position
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
  const targetRow = shouldCreateNewRow
    ? 1
    : Math.max(Math.round(localYCoordinate / (rowHeight + gutterSize)), 0);

  const requestedPanelData = { ...currentPanelData };
  if (isResize) {
    requestedPanelData.width = Math.max(targetColumn - requestedPanelData.column, 1);
    requestedPanelData.height = Math.max(targetRow - requestedPanelData.row, 1);
  } else {
    requestedPanelData.column = targetColumn;
    requestedPanelData.row = targetRow;
  }

  // console.log({ shouldCreateNewRow, targetRow, requestedPanelData });

  // resolve the new grid layout
  if (
    hasChangedGridRow ||
    !isGridDataEqual(requestedPanelData, lastRequestedPanelPosition.current)
  ) {
    const newTargetRowId = shouldCreateNewRow ? uuidv4() : targetRowId;
    lastRequestedPanelPosition.current = { ...requestedPanelData };
    // console.log({ newTargetRowId });
    const nextLayout = cloneDeep(currentLayout);
    Object.entries(nextLayout).forEach(([rowId, row]) => {
      const { [interactionEvent.id]: interactingPanel, ...otherPanels } = row.panels;
      nextLayout[rowId] = { ...row, panels: { ...otherPanels } };
    });

    // resolve destination grid
    if (shouldCreateNewRow) {
      const newOrder = currentLayout[targetRowId].order + 1;
      nextLayout[newTargetRowId] = {
        id: newTargetRowId,
        isCollapsible: false,
        order: newOrder,
        panels: {},
      };
      Object.keys(nextLayout).forEach((rowId) => {
        if (rowId !== newTargetRowId && nextLayout[rowId].order >= newOrder) {
          nextLayout[rowId].order += 1;
        }
      });
    }
    const destinationGrid = nextLayout[newTargetRowId];
    const resolvedDestinationGrid = resolveGridRow(destinationGrid, requestedPanelData);
    nextLayout[newTargetRowId] = resolvedDestinationGrid;

    // resolve origin grid
    if (hasChangedGridRow) {
      const originGrid = nextLayout[lastRowId];
      if (!originGrid.isCollapsible && Object.keys(originGrid.panels).length === 0) {
        delete nextLayout[lastRowId];
      } else {
        const resolvedOriginGrid = resolveGridRow(originGrid);
        nextLayout[lastRowId] = resolvedOriginGrid;
      }
      interactionEvent$.next({
        ...interactionEvent,
        targetRow: newTargetRowId,
      });
    }
    if (!deepEqual(currentLayout, nextLayout)) {
      console.log({ currentLayout, nextLayout });
      proposedGridLayout$.next(nextLayout);
    }
  }

  // // re-render when the target row changes
  // if (hasChangedGridRow) {
  //   interactionEvent$.next({
  //     ...interactionEvent,
  //     targetRow: newTargetRowId,
  //   });
  // }
};

export const commitAction = ({
  activePanel$,
  interactionEvent$,
  gridLayout$,
  proposedGridLayout$,
}: GridLayoutStateManager) => {
  activePanel$.next(undefined);
  interactionEvent$.next(undefined);
  if (proposedGridLayout$.value && !deepEqual(proposedGridLayout$.value, gridLayout$.getValue())) {
    gridLayout$.next(cloneDeep(proposedGridLayout$.value));
  }
  proposedGridLayout$.next(undefined);
};

export const cancelAction = ({
  activePanel$,
  interactionEvent$,
  proposedGridLayout$,
}: GridLayoutStateManager) => {
  activePanel$.next(undefined);
  interactionEvent$.next(undefined);
  proposedGridLayout$.next(undefined);
};
