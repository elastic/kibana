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
    orderedSections$: { value: orderedSections },
    rowRefs: { current: gridRowElements },
  } = gridLayoutStateManager;
  const activePanel = activePanel$.value;
  const currentLayout = gridLayout$.value;
  if (!activePanel || !runtimeSettings || !gridRowElements || !currentLayout) {
    // if no interaction event return early
    return;
  }

  const targetRowIsMain = activePanel.targetRow.includes('main');
  const currentPanelData: GridPanelData = targetRowIsMain
    ? (currentLayout[activePanel.id] as GridPanelData)
    : (currentLayout[activePanel.targetRow] as GridRowData).panels[activePanel.id];

  if (!currentPanelData) {
    return;
  }

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

  const { columnCount, gutterSize, rowHeight, columnPixelWidth } = runtimeSettings;

  // find the grid that the preview rect is over
  const lastRowId = activePanel.targetRow;
  const targetRowId = (() => {
    // TODO: temporary blocking of moving with keyboard between sections till we have a better way to handle keyboard events between rows
    if (isResize || isKeyboardEvent(e)) return lastRowId;
    const previewBottom = previewRect.top + rowHeight;

    let highestOverlap = -Infinity;
    let highestOverlapRowId = '';
    Object.entries({ ...gridRowElements, main: gridLayoutElement }).forEach(([id, row]) => {
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
  console.log({ orderedSections, targetRowId, lastRowId, elements: { ...gridRowElements } });

  // re-render
  activePanel$.next({
    ...activePanel,
    id: activePanel.id,
    position: previewRect,
    targetRow: targetRowId,
  });

  // calculate the requested grid position
  const targetedGridRow = gridRowElements[targetRowId];
  const targetedGridRowRect = targetedGridRow?.getBoundingClientRect();

  const targetedGridLeft = targetedGridRowRect?.left ?? 0;
  const targetedGridTop = targetedGridRowRect?.top ?? 0;

  const maxColumn = isResize ? columnCount : columnCount - currentPanelData.width;

  const localXCoordinate = isResize
    ? previewRect.right - targetedGridLeft
    : previewRect.left - targetedGridLeft;
  let localYCoordinate = isResize
    ? previewRect.bottom - targetedGridTop
    : previewRect.top - targetedGridTop;
  if (targetRowId === 'main') {
    const subtracted = false;

    Object.keys(gridLayoutStateManager.headerRefs.current).forEach((rowId) => {
      const headerElement = gridLayoutStateManager.headerRefs.current[rowId];
      const footerElement = gridLayoutStateManager.footerRefs.current[rowId];
      const headerRect = headerElement?.getBoundingClientRect() ?? { top: 0, height: 0 };
      const footerRect = footerElement?.getBoundingClientRect() ?? { top: 0, height: 0 };

      if (headerRect.top < previewRect.top) {
        console.log('SUBTRACT HEADER');
        localYCoordinate -= headerRect.height;
        localYCoordinate += rowHeight + gutterSize;
      }
      if (footerRect.top < previewRect.top) {
        localYCoordinate -= footerRect.height;
      }
    });
  }

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
  if (targetRowId === 'main') {
    // main section but wrapper element doesn't exist yet
    // requestedPanelData.row = 0;
  } else if (targetRowId.includes('main')) {
    requestedPanelData.row += orderedSections[targetRowId].row;
  }
  console.log({ requestedPanelData: { ...requestedPanelData } });
  // resolve the new grid layout
  if (
    hasChangedGridRow ||
    !isGridDataEqual(requestedPanelData, lastRequestedPanelPosition.current)
  ) {
    lastRequestedPanelPosition.current = { ...requestedPanelData };

    let nextLayout = cloneDeep(currentLayout) ?? {};
    if (targetRowIsMain) {
      const { [activePanel.id]: interactingPanel, ...otherWidgets } = nextLayout;
      nextLayout = { ...otherWidgets };
    } else {
      const row = nextLayout[activePanel.targetRow] as GridRowData;
      const { [activePanel.id]: interactingPanel, ...otherPanels } = row.panels;
      nextLayout[activePanel.targetRow] = {
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
