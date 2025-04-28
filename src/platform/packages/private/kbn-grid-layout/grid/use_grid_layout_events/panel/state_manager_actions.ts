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
import { GridLayoutStateManager, GridPanelData, GridRowData } from '../../types';
import { isGridDataEqual, isLayoutEqual } from '../../utils/equality_checks';
import { resolveGridRow, resolveMainGrid } from '../../utils/resolve_grid_row';
import { getSensorType, isKeyboardEvent } from '../sensors';
import { PointerPosition, UseractivePanel } from '../types';
import { getDragPreviewRect, getResizePreviewRect, getSensorOffsets } from './utils';
import { GridLayoutContextType } from '../../use_grid_layout_context';

export const startAction = (
  e: UseractivePanel,
  gridLayoutStateManager: GridLayoutStateManager,
  type: 'drag' | 'resize',
  rowId: string,
  panelId: string
) => {
  const panelRef = gridLayoutStateManager.panelRefs.current[panelId];
  if (!panelRef) return;

  const panelRect = panelRef.getBoundingClientRect();
  gridLayoutStateManager.activePanel$.next({
    type,
    id: panelId,
    panelDiv: panelRef,
    targetRow: rowId,
    sensorType: getSensorType(e),
    position: panelRect,
    sensorOffsets: getSensorOffsets(e, panelRect),
  });
};

export const moveAction = (
  e: UseractivePanel,
  gridLayoutStateManager: GridLayoutContextType['gridLayoutStateManager'],
  pointerPixel: PointerPosition,
  lastRequestedPanelPosition: MutableRefObject<GridPanelData | undefined>
) => {
  const {
    runtimeSettings$: { value: runtimeSettings },
    activePanel$,
    gridLayout$,
    layoutRef: { current: gridLayoutElement },
    headerRefs: { current: gridHeaderElements },
    rowRefs: { current: gridRowElements },
  } = gridLayoutStateManager;
  const activePanel = activePanel$.value;
  const currentLayout = gridLayout$.value;
  if (!activePanel || !runtimeSettings || !gridRowElements || !currentLayout) {
    // if no interaction event return early
    return;
  }

  const currentPanelData = currentLayout[activePanel.targetRow].panels[activePanel.id];
  if (!currentPanelData) {
    return;
  }
  console.log({ currentLayout, activePanel, currentPanelData });

  const { columnCount, gutterSize, rowHeight, columnPixelWidth } = runtimeSettings;
  const isResize = activePanel.type === 'resize';

  const previewRect = (() => {
    if (isResize) {
      const layoutRef = gridLayoutStateManager.layoutRef.current;
      const maxRight = layoutRef ? layoutRef.getBoundingClientRect().right : window.innerWidth;
      return getResizePreviewRect({ activePanel, pointerPixel, maxRight });
    } else {
      return getDragPreviewRect({ activePanel, pointerPixel });
    }
  })();

  // find the grid that the preview rect is over
  const lastRowId = activePanel.targetRow;
  let previousSection;
  const targetRowId = (() => {
    // TODO: temporary blocking of moving with keyboard between sections till we have a better way to handle keyboard events between rows
    if (isResize || isKeyboardEvent(e)) return lastRowId;

    const previewBottom = previewRect.top + rowHeight;
    let highestOverlap = -Infinity;
    let highestOverlapRowId = '';
    console.log('elements', { ...gridRowElements });
    Object.keys(currentLayout).forEach((rowId) => {
      const row = currentLayout[rowId].isCollapsed
        ? gridHeaderElements[rowId]
        : gridRowElements[rowId];
      if (!row) return;
      const rowRect = row.getBoundingClientRect();
      const overlap =
        Math.min(previewBottom, rowRect.bottom) - Math.max(previewRect.top, rowRect.top);
      if (overlap > highestOverlap) {
        highestOverlap = overlap;
        highestOverlapRowId = rowId;
      }
    });
    console.log('highestOverlapRowId', highestOverlapRowId);
    if (currentLayout[highestOverlapRowId].isCollapsed) {
      previousSection = highestOverlapRowId;
      // skip past collapsed section into next "main" section
      const previousOrder = currentLayout[highestOverlapRowId].order;
      highestOverlapRowId = `main-${previousOrder}`;
    }
    return highestOverlapRowId;
  })();

  // calculate the requested grid position
  const gridLayoutRect = gridLayoutElement?.getBoundingClientRect();
  const targetColumn = (() => {
    const targetedGridLeft = gridLayoutRect?.left ?? 0;
    const localXCoordinate = isResize
      ? previewRect.right - targetedGridLeft
      : previewRect.left - targetedGridLeft;
    const maxColumn = isResize ? columnCount : columnCount - currentPanelData.width;
    return Math.min(
      Math.max(Math.round(localXCoordinate / (columnPixelWidth + gutterSize)), 0),
      maxColumn
    );
  })();
  const targetRow = (() => {
    if (currentLayout[targetRowId]) {
      // this section already exists, so use the wrapper element to figure out target row
      const targetedGridRow = gridRowElements[targetRowId];
      const targetedGridRowRect = targetedGridRow?.getBoundingClientRect();
      const targetedGridTop = targetedGridRowRect?.top ?? 0;
      const localYCoordinate = isResize
        ? previewRect.bottom - targetedGridTop
        : previewRect.top - targetedGridTop;
      return Math.max(Math.round(localYCoordinate / (rowHeight + gutterSize)), 0);
    } else {
      // this section doesn't exist yet, so we have to get creative
      return currentLayout[previousSection!].row + 1;
    }
  })();

  const requestedPanelData = { ...currentPanelData };
  if (isResize) {
    requestedPanelData.width = Math.max(targetColumn - requestedPanelData.column, 1);
    requestedPanelData.height = Math.max(targetRow - requestedPanelData.row, 1);
  } else {
    requestedPanelData.column = targetColumn;
    requestedPanelData.row = targetRow;
  }
  console.log({
    targetRowId,
    targetColumn,
    targetRow,
    requestedPanelData: { ...requestedPanelData },
  });

  const hasChangedGridRow = targetRowId !== lastRowId;

  // resolve the new grid layout
  if (
    hasChangedGridRow ||
    !isGridDataEqual(requestedPanelData, lastRequestedPanelPosition.current)
  ) {
    lastRequestedPanelPosition.current = { ...requestedPanelData };

    const nextLayout = cloneDeep(currentLayout) ?? {};
    if (!nextLayout[targetRowId]) {
      // section doesn't exist, so add it
      const { row: nextRow, order: nextOrder } = nextLayout[previousSection!];
      // push other rows down
      Object.keys(nextLayout).forEach((rowId) => {
        if (nextLayout[rowId].row > nextRow) {
          nextLayout[rowId].row += requestedPanelData.height;
          nextLayout[rowId].order += 2;
        }
      });
      nextLayout[targetRowId] = {
        id: targetRowId,
        isMainSection: true,
        panels: {},
        row: nextRow + 1,
        order: nextOrder + 1,
      };
      requestedPanelData.row = 0;
    }

    // const interactingPanel = { ...nextLayout[activePanel.targetRow].panels[activePanel.id] };
    delete nextLayout[lastRowId].panels[activePanel.id];

    console.log('BEFORE', { lastRowId, nextLayout: cloneDeep(nextLayout) });

    // resolve destination grid
    const destinationGrid = nextLayout[targetRowId] as GridRowData;
    const resolvedDestinationGrid = resolveGridRow(destinationGrid.panels, requestedPanelData);
    (nextLayout[targetRowId] as GridRowData).panels = resolvedDestinationGrid;

    // resolve origin grid
    if (hasChangedGridRow) {
      const originGrid = nextLayout[lastRowId] as GridRowData;
      const resolvedOriginGrid = resolveGridRow(originGrid.panels);
      (nextLayout[lastRowId] as GridRowData).panels = resolvedOriginGrid;

      if (
        nextLayout[lastRowId].isMainSection &&
        !Object.keys(nextLayout[lastRowId].panels).length
      ) {
        delete nextLayout[lastRowId];
      }
    }
    if (currentLayout && !deepEqual(currentLayout, nextLayout)) {
      console.log({ nextLayout });
      gridLayout$.next(nextLayout);
    }
  }

  // re-render the active panel
  activePanel$.next({
    ...activePanel,
    id: activePanel.id,
    position: previewRect,
    targetRow: targetRowId,
  });
};

export const commitAction = ({ activePanel$, panelRefs }: GridLayoutStateManager) => {
  const event = activePanel$.getValue();
  activePanel$.next(undefined);

  if (!event) return;
  panelRefs.current[event.id]?.scrollIntoView({
    behavior: 'smooth',
    block: 'center',
  });
};

export const cancelAction = ({ activePanel$ }: GridLayoutStateManager) => {
  activePanel$.next(undefined);
};
