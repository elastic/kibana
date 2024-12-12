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
import { GridLayoutStateManager } from '../types';
import { defaultKeyboardCoordinateGetter, keyboardCodes } from './defaults';

import { resolveGridRow } from '../utils/resolve_grid_row';

const isKeyboardInteractionEvent = (
  interactionEvent$: GridLayoutStateManager['interactionEvent$']
) =>
  interactionEvent$.value?.type === 'keyboardDrag' ||
  interactionEvent$.value?.type === 'keyboardResize';

// todo: fix the types here
const handleStart = (
  e: KeyboardEvent,
  gridLayoutStateManager: GridLayoutStateManager,
  { type, id, panelDiv, targetRowIndex }
) => {
  console.log(
    'START: if theres no interaction event and the user pressed the start key, start the interaction'
  );
  // set the stableGridLayout$ for the ability to cancel
  gridLayoutStateManager.stableGridLayout$.next(
    cloneDeep(gridLayoutStateManager.gridLayout$.getValue())
  );
  gridLayoutStateManager.interactionEvent$.next({ type, id, panelDiv, targetRowIndex });
};

const handleEnd = (e: KeyboardEvent, gridLayoutStateManager: GridLayoutStateManager) => {
  console.log(
    'END: if there is an interaction event and the user pressed the end key, end the interaction'
  );

  gridLayoutStateManager.interactionEvent$.next(undefined);
  gridLayoutStateManager.activePanel$.next(undefined);
};

// TODO: Implement handleCancel
const handleCancel = (e: KeyboardEvent, gridLayoutStateManager: GridLayoutStateManager) => {
  console.log(
    'CANCEL: if there is an interaction event and the user pressed the cancel key, cancel the interaction'
  );
  gridLayoutStateManager.interactionEvent$.next(undefined);
  gridLayoutStateManager.activePanel$.next(undefined);
  gridLayoutStateManager.gridLayout$.next(
    cloneDeep(gridLayoutStateManager.stableGridLayout$.getValue())
  );
};

const handleMove = (e: KeyboardEvent, gridLayoutStateManager: GridLayoutStateManager) => {
  console.log('MOVE: if the user pressed a move key, move the interaction event');
};

export const onKeyDown = (e: KeyboardEvent, gridLayoutStateManager: GridLayoutStateManager, a) => {
  e.stopPropagation();
  const { interactionEvent$ } = gridLayoutStateManager;
  console.log(e.code);
  if (!interactionEvent$.value) {
    if (keyboardCodes.start.includes(e.code)) {
      return handleStart(e, gridLayoutStateManager, a);
    } else {
      console.log('if user pressed anything else, ignore the event');
      return;
    }
  }
  if (!isKeyboardInteractionEvent(interactionEvent$)) {
    console.log('if user is in the middle of a different event, ignore the event');
    return;
  }

  if (keyboardCodes.end.includes(e.code)) {
    return handleEnd(e, gridLayoutStateManager);
  }

  if (keyboardCodes.cancel.includes(e.code)) {
    // TODO: Implement handleCancel - go back to previous state before interaction started
    return handleCancel(e, gridLayoutStateManager);
  }

  // if the user pressed a move key, move the interaction event
  if (keyboardCodes.move.includes(e.code)) {
    console.log('MOVE: if the user pressed a move key, move the interaction event');

    const gridRowElements = gridLayoutStateManager.rowRefs.current;

    const interactionEvent = interactionEvent$.value;
    //   const isResize = interactionEvent?.type === 'resize';

    const currentLayout = gridLayoutStateManager.gridLayout$.value;
    const currentGridData = (() => {
      for (const row of currentLayout) {
        if (row.panels[interactionEvent.id]) return row.panels[interactionEvent.id];
      }
    })();

    const { runtimeSettings$ } = gridLayoutStateManager;
    if (!runtimeSettings$.value || !gridRowElements || !currentGridData) {
      return;
    }
    console.log(runtimeSettings$.value);
    const { columnCount, gutterSize, rowHeight, columnPixelWidth } =
      gridLayoutStateManager.runtimeSettings$.value;

    const panelRect = interactionEvent.panelDiv.getBoundingClientRect();

    // const previewRect = {
    //     left: panelRect.x + columnPixelWidth + gutterSize,
    //     right: panelRect.x + panelRect.width + columnPixelWidth + gutterSize,
    //     top: panelRect.y + rowHeight + gutterSize,
    //     bottom: panelRect.y + panelRect.height + rowHeight + gutterSize,
    //   };

    const previewRect = defaultKeyboardCoordinateGetter(e, {
      currentCoordinates: {
        left: panelRect.x,
        right: panelRect.x + panelRect.width,
        top: panelRect.y,
        bottom: panelRect.y + panelRect.height,
      },
      runtimeSettings: runtimeSettings$.value,
    });

    gridLayoutStateManager.activePanel$.next({ id: interactionEvent.id, position: previewRect });

    //   // find the grid that the preview rect is over
    const previewBottom = previewRect.top + gridLayoutStateManager.runtimeSettings$.value.rowHeight;
    const lastRowIndex = interactionEvent?.targetRowIndex;
    const targetRowIndex = (() => {
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

    //   // re-render when the target row changes
    if (hasChangedGridRow) {
      interactionEvent$.next({
        ...interactionEvent,
        targetRowIndex,
      });
    }

    //   // calculate the requested grid position

    const targetedGridRow = gridRowElements[targetRowIndex];
    const targetedGridLeft = targetedGridRow?.getBoundingClientRect().left ?? 0;
    const targetedGridTop = targetedGridRow?.getBoundingClientRect().top ?? 0;

    const maxColumn = columnCount - currentGridData.width;

    const localXCoordinate = previewRect.left - targetedGridLeft;
    const localYCoordinate = previewRect.top - targetedGridTop;

    const targetColumn = Math.min(
      Math.max(Math.round(localXCoordinate / (columnPixelWidth + gutterSize)), 0),
      maxColumn
    );
    const targetRow = Math.max(Math.round(localYCoordinate / (rowHeight + gutterSize)), 0);

    const requestedGridData = { ...currentGridData };

    requestedGridData.column = targetColumn;
    requestedGridData.row = targetRow;

    // resolve the new grid layout
    if (
      hasChangedGridRow
      // !isGridDataEqual(requestedGridData, lastRequestedPanelPosition.current)
    ) {
      // lastRequestedPanelPosition.current = { ...requestedGridData };

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
        gridLayoutStateManager.gridLayout$.next(nextLayout);
      }
    }
  }
};
