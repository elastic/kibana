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
    // TODO: temporary blocking of moving with keyboard between sections till we can fix the bug with commiting the action
    if (isResize || isKeyboardEvent(e)) return lastRowId;

    const previewBottom = previewRect.top + rowHeight;
    if (previewRect.top < (gridLayoutElement?.getBoundingClientRect().top ?? 0)) {
      return `main-0`;
    }

    let highestOverlap = -Infinity;
    let highestOverlapRowId = '';
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
      // this section doesn't exist yet, so target the first row of that section
      return 0;
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
      const { order: nextOrder } =
        targetRowId === 'main-0' ? { order: 0 } : nextLayout[previousSection!];

      // push other sections down
      Object.keys(nextLayout).forEach((rowId) => {
        if (nextLayout[rowId].order > nextOrder) {
          nextLayout[rowId].order += 2;
        }
      });
      // add the new section
      nextLayout[targetRowId] = {
        id: targetRowId,
        isMainSection: true,
        panels: {},
        order: nextOrder + 1,
      };
      requestedPanelData.row = 0;
    }

    // remove the panel from where it started so that we can apply the drag request
    delete nextLayout[lastRowId].panels[activePanel.id];

    // resolve destination grid
    const destinationGrid = nextLayout[targetRowId] as unknown as GridRowData;
    const resolvedDestinationGrid = resolveGridRow(destinationGrid.panels, requestedPanelData);
    (nextLayout[targetRowId] as unknown as GridRowData).panels = resolvedDestinationGrid;

    // resolve origin grid
    if (hasChangedGridRow) {
      const originGrid = nextLayout[lastRowId] as unknown as GridRowData;
      const resolvedOriginGrid = resolveGridRow(originGrid.panels);
      (nextLayout[lastRowId] as unknown as GridRowData).panels = resolvedOriginGrid;

      if (
        nextLayout[lastRowId].isMainSection &&
        !Object.keys(nextLayout[lastRowId].panels).length
      ) {
        // delete empty main section rows
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
