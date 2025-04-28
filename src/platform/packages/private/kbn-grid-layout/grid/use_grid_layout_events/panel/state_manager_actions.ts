/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { cloneDeep } from 'lodash';
import { MutableRefObject } from 'react';
import { GridLayoutStateManager, GridPanelData, GridRowData } from '../../types';
import { isGridDataEqual, isLayoutEqual } from '../../utils/equality_checks';
import { resolveGridRow, resolveMainGrid } from '../../utils/resolve_grid_row';
import { getSensorType, isKeyboardEvent } from '../sensors';
import { PointerPosition, UserInteractionEvent } from '../types';
import { getDragPreviewRect, getResizePreviewRect, getSensorOffsets } from './utils';
import { GridLayoutContextType } from '../../use_grid_layout_context';

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
};

export const moveAction = (
  e: UserInteractionEvent,
  gridLayoutStateManager: GridLayoutContextType['gridLayoutStateManager'],
  pointerPixel: PointerPosition,
  lastRequestedPanelPosition: MutableRefObject<GridPanelData | undefined>
) => {
  const {
    runtimeSettings$: { value: runtimeSettings },
    interactionEvent$,
    gridLayout$,
    activePanel$,
    orderedSections$: { value: orderedSections },
    rowRefs: { current: gridRowElements },
  } = gridLayoutStateManager;
  const interactionEvent = interactionEvent$.value;
  const currentLayout = gridLayout$.value;
  if (!interactionEvent || !runtimeSettings || !gridRowElements || !currentLayout) {
    // if no interaction event return early
    return;
  }

  const targetRowIsMain = interactionEvent.targetRow.includes('main');
  const currentPanelData: GridPanelData = targetRowIsMain
    ? (currentLayout[interactionEvent.id] as GridPanelData)
    : (currentLayout[interactionEvent.targetRow] as GridRowData).panels[interactionEvent.id];

  if (!currentPanelData) {
    return;
  }

  const isResize = interactionEvent.type === 'resize';

  const previewRect = (() => {
    if (isResize) {
      const layoutRef = gridLayoutStateManager.layoutRef.current;
      const maxRight = layoutRef ? layoutRef.getBoundingClientRect().right : window.innerWidth;
      return getResizePreviewRect({ interactionEvent, pointerPixel, maxRight });
    } else {
      return getDragPreviewRect({ interactionEvent, pointerPixel });
    }
  })();

  activePanel$.next({ id: interactionEvent.id, position: previewRect });

  const { columnCount, gutterSize, rowHeight, columnPixelWidth } = runtimeSettings;

  // find the grid that the preview rect is over
  const lastRowId = interactionEvent.targetRow;
  const targetRowId = (() => {
    // TODO: temporary blocking of moving with keyboard between sections till we have a better way to handle keyboard events between rows
    if (isResize || isKeyboardEvent(e)) return lastRowId;
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
  const hasChangedGridRow = targetRowId !== lastRowId;

  // re-render when the target row changes
  if (hasChangedGridRow) {
    interactionEvent$.next({
      ...interactionEvent,
      targetRow: targetRowId,
    });
  }
  // calculate the requested grid position
  const targetedGridRow = gridRowElements[targetRowId];
  const targetedGridRowRect = targetedGridRow?.getBoundingClientRect();

  const targetedGridLeft = targetedGridRowRect?.left ?? 0;
  const targetedGridTop = targetedGridRowRect?.top ?? 0;

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
  if (targetRowId.includes('main')) {
    requestedPanelData.row += orderedSections[targetRowId].row;
  }

  // resolve the new grid layout
  if (
    hasChangedGridRow ||
    !isGridDataEqual(requestedPanelData, lastRequestedPanelPosition.current)
  ) {
    lastRequestedPanelPosition.current = { ...requestedPanelData };

    let nextLayout = cloneDeep(currentLayout) ?? {};
    if (targetRowIsMain) {
      const { [interactionEvent.id]: interactingPanel, ...otherWidgets } = nextLayout;
      nextLayout = { ...otherWidgets };
    } else {
      const row = nextLayout[interactionEvent.targetRow] as GridRowData;
      const { [interactionEvent.id]: interactingPanel, ...otherPanels } = row.panels;
      nextLayout[interactionEvent.targetRow] = {
        ...row,
        type: 'section',
        panels: { ...otherPanels },
      };
    }

    // resolve destination grid
    if (targetRowId.includes('main')) {
      nextLayout = resolveMainGrid(nextLayout, requestedPanelData);
    } else {
      const destinationGrid = nextLayout[targetRowId] as GridRowData;
      const resolvedDestinationGrid = resolveGridRow(destinationGrid.panels, requestedPanelData);
      (nextLayout[targetRowId] as GridRowData).panels = resolvedDestinationGrid;
    }

    // resolve origin grid
    if (hasChangedGridRow) {
      if (lastRowId.includes('main')) {
        nextLayout = resolveMainGrid(nextLayout);
      } else {
        const originGrid = nextLayout[lastRowId] as GridRowData;
        const resolvedOriginGrid = resolveGridRow(originGrid.panels);
        (nextLayout[lastRowId] as GridRowData).panels = resolvedOriginGrid;
      }
    }
    if (currentLayout && !isLayoutEqual(currentLayout, nextLayout)) {
      gridLayout$.next(nextLayout);
    }

    if (hasChangedGridRow) {
      debugger;
    }
  }
};

export const commitAction = ({
  activePanel$,
  interactionEvent$,
  panelRefs,
}: GridLayoutStateManager) => {
  const event = interactionEvent$.getValue();
  activePanel$.next(undefined);
  interactionEvent$.next(undefined);

  if (!event) return;
  panelRefs.current[event.id]?.scrollIntoView({
    behavior: 'smooth',
    block: 'center',
  });
};

export const cancelAction = ({ activePanel$, interactionEvent$ }: GridLayoutStateManager) => {
  activePanel$.next(undefined);
  interactionEvent$.next(undefined);
};
