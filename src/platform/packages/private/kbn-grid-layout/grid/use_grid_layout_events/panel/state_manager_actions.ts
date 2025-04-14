/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { cloneDeep, isEmpty } from 'lodash';
import deepEqual from 'fast-deep-equal';
import { MutableRefObject } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { GridLayoutData, GridLayoutStateManager, GridPanelData, GridRowData } from '../../types';
import { getDragPreviewRect, getSensorOffsets, getResizePreviewRect } from './utils';
import { resolveGridRow } from '../../utils/resolve_grid_row';
import { isGridDataEqual } from '../../utils/equality_checks';
import { PointerPosition, UserInteractionEvent } from '../types';
import { getSensorType } from '../sensors';
import { getRowRect } from '../../utils/calculations';

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
    headerRefs: { current: gridRowHeaders },
    rowDimensionsRefs: { current: gridRowRefs },
  } = gridLayoutStateManager;
  const interactionEvent = interactionEvent$.value;
  if (!interactionEvent || !runtimeSettings) {
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
      const maxRight = layoutRef ? layoutRef.getBoundingClientRect().right : window.innerWidth;
      return getResizePreviewRect({ interactionEvent, pointerPixel, maxRight });
    } else {
      return getDragPreviewRect({ interactionEvent, pointerPixel });
    }
  })();

  activePanel$.next({ id: interactionEvent.id, position: previewRect });

  const { columnCount, gutterSize, rowHeight, columnPixelWidth } = runtimeSettings;

  const findRowBelow = (rowId: string, layout: GridLayoutData) => {
    return Object.values(currentLayout).find((r) => r.order === layout[rowId].order + 1);
  };

  // find the grid that the preview rect is over
  const lastRowId = interactionEvent.targetRow;
  const targetRowId = (() => {
    if (isResize) return lastRowId;
    const previewBottom = previewRect.top + rowHeight;

    let highestOverlap = -Infinity;
    let highestOverlapRowId = '';
    Object.entries(gridRowHeaders).forEach(([id, row]) => {
      if (!row) return;
      const { top: rowTop, bottom: rowBottom } = getRowRect(id, gridLayoutStateManager);
      const overlap = Math.min(previewBottom, rowBottom) - Math.max(previewRect.top, rowTop);
      // do not allow to drop into a collapsed row
      if (overlap > highestOverlap) {
        highestOverlap = overlap;
        highestOverlapRowId = id;
      }
    });

    // this is the case when the target drop row is collapsed but the next one is not collapsible, so we add panel to next non collapsible row
    if (currentLayout[highestOverlapRowId] && currentLayout[highestOverlapRowId].isCollapsed) {
      const rowBelow = findRowBelow(highestOverlapRowId, currentLayout);
      if (rowBelow && !rowBelow?.isCollapsible) {
        highestOverlapRowId = rowBelow.id;
      }
    }
    return highestOverlapRowId;
  })();

  const hasChangedGridRow = targetRowId !== lastRowId;

  // calculate the requested grid position
  const targetedRowRef = gridRowRefs[targetRowId];
  const targetedGridLeft = targetedRowRef?.getBoundingClientRect().left ?? 0;
  const targetedGridTop = targetedRowRef?.getBoundingClientRect().top ?? 0;

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
    (hasChangedGridRow ||
      !isGridDataEqual(requestedPanelData, lastRequestedPanelPosition.current)) &&
    !currentLayout[targetRowId].isCollapsed
  ) {
    lastRequestedPanelPosition.current = { ...requestedPanelData };

    let nextLayout = cloneDeep(currentLayout);
    Object.entries(nextLayout).forEach(([rowId, row]) => {
      const { [interactionEvent.id]: interactingPanel, ...otherPanels } = row.panels;
      nextLayout[rowId] = { ...row, panels: { ...otherPanels } };
    });

    // resolve destination grid
    nextLayout = normalizeOrder(nextLayout);
    const destinationGrid = nextLayout[targetRowId];

    const resolvedDestinationGrid = resolveGridRow(destinationGrid, requestedPanelData);
    nextLayout[targetRowId] = resolvedDestinationGrid;

    // resolve origin grid
    if (hasChangedGridRow) {
      const originGrid = nextLayout[lastRowId];
      if (!originGrid.isCollapsible && isEmpty(originGrid.panels)) {
        delete nextLayout[lastRowId];
        nextLayout = normalizeOrder(nextLayout);
      } else {
        const resolvedOriginGrid = resolveGridRow(originGrid);
        nextLayout[lastRowId] = resolvedOriginGrid;
      }
    }
    if (!deepEqual(currentLayout, nextLayout)) {
      proposedGridLayout$.next(nextLayout);
    }

    console.log('nextLayout', gridLayoutStateManager.proposedGridLayout$.getValue());
    // return;
  } else if (
    hasChangedGridRow ||
    (!isGridDataEqual(requestedPanelData, lastRequestedPanelPosition.current) &&
      currentLayout[targetRowId].isCollapsed)
  ) {
    lastRequestedPanelPosition.current = { ...requestedPanelData };
    const targetRowOrder = currentLayout[targetRowId].order;
    const nextLayout = cloneDeep(currentLayout);

    Object.entries(nextLayout).forEach(([rowId, row]) => {
      const { [interactionEvent.id]: interactingPanel, ...otherPanels } = row.panels;
      nextLayout[rowId] = {
        ...row,
        order: targetRowOrder < row.order ? row.order + 1 : row.order,
        panels: { ...otherPanels },
      };
    });
    const newRow = createNewRow({ order: targetRowOrder + 1 });

    const resolvedDestinationGrid = resolveGridRow(newRow, requestedPanelData);
    nextLayout[newRow.id] = resolvedDestinationGrid;

    // resolve origin grid
    if (hasChangedGridRow) {
      const originGrid = nextLayout[lastRowId];
      const resolvedOriginGrid = resolveGridRow(originGrid);
      nextLayout[lastRowId] = resolvedOriginGrid;
      console.log('originGrid', originGrid);
    }
    if (!deepEqual(currentLayout, nextLayout)) {
      proposedGridLayout$.next(nextLayout);
    }
  }
  // re-render when the target row changes
  if (hasChangedGridRow) {
    interactionEvent$.next({
      ...interactionEvent,
      targetRow: targetRowId,
    });
  }
};

const createNewRow = ({ id = uuidv4(), ...rest }: Partial<GridRowData>): GridRowData => ({
  id,
  order: -1,
  isCollapsible: false,
  isCollapsed: false,
  panels: {},
  title: ' ',
  ...rest,
});

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

function normalizeOrder(obj: GridLayoutData) {
  const entries = Object.entries(obj);

  // Sort by current order
  entries.sort(([, a], [, b]) => a.order - b.order);

  // Reassign order incrementally
  entries.forEach(([, section], index) => {
    section.order = index;
  });

  return Object.fromEntries(entries);
}
