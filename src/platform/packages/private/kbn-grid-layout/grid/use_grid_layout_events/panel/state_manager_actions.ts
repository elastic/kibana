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

import { GridLayoutStateManager, GridPanelData, GridSectionData, OrderedLayout } from '../../types';
import { GridLayoutContextType } from '../../use_grid_layout_context';
import { isGridDataEqual, isOrderedLayoutEqual } from '../../utils/equality_checks';
import { resolveGridSection } from '../../utils/resolve_grid_section';
import { getSensorType, isKeyboardEvent } from '../sensors';
import { PointerPosition, UserInteractionEvent } from '../types';
import { getDragPreviewRect, getResizePreviewRect, getSensorOffsets } from './utils';

let startingLayout: OrderedLayout | undefined;

export const startAction = (
  e: UserInteractionEvent,
  gridLayoutStateManager: GridLayoutStateManager,
  type: 'drag' | 'resize',
  sectionId: string,
  panelId: string
) => {
  const panelRef = gridLayoutStateManager.panelRefs.current[panelId];
  if (!panelRef) return;

  startingLayout = gridLayoutStateManager.gridLayout$.getValue();
  const panelRect = panelRef.getBoundingClientRect();
  gridLayoutStateManager.activePanel$.next({
    type,
    id: panelId,
    panelDiv: panelRef,
    targetRow: sectionId,
    sensorType: getSensorType(e),
    position: panelRect,
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
    activePanel$,
    gridLayout$,
    layoutRef: { current: gridLayoutElement },
    headerRefs: { current: gridHeaderElements },
    sectionRefs: { current: gridSectionElements },
  } = gridLayoutStateManager;
  const activePanel = activePanel$.value;
  const currentLayout = gridLayout$.value;
  if (!activePanel || !runtimeSettings || !gridSectionElements || !currentLayout) {
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
  const lastSectionId = activePanel.targetRow;
  let previousSection;
  const targetSectionId = (() => {
    // TODO: temporary blocking of moving with keyboard between sections till we can fix the bug with commiting the action
    if (isResize || isKeyboardEvent(e)) return lastSectionId;

    const previewBottom = previewRect.top + rowHeight;
    if (previewRect.top < (gridLayoutElement?.getBoundingClientRect().top ?? 0)) {
      return `main-0`;
    }

    /** TODO: we can probably just use section headers + the top of the panel for this */
    let highestOverlap = -Infinity;
    let highestOverlapSectionId = '';
    Object.keys(currentLayout).forEach((sectionId) => {
      const section = currentLayout[sectionId];
      const sectionElement =
        !section.isMainSection && (section.isCollapsed || Object.keys(section.panels).length === 0)
          ? gridHeaderElements[sectionId]
          : gridSectionElements[sectionId];
      if (!sectionElement) return;
      const rowRect = sectionElement.getBoundingClientRect();
      const overlap =
        Math.min(previewBottom, rowRect.bottom) - Math.max(previewRect.top, rowRect.top);
      if (overlap > highestOverlap) {
        highestOverlap = overlap;
        highestOverlapSectionId = sectionId;
      }
    });
    const section = currentLayout[highestOverlapSectionId];
    if (!section.isMainSection && section.isCollapsed) {
      previousSection = highestOverlapSectionId;
      // skip past collapsed section into next "main" section
      const previousOrder = currentLayout[highestOverlapSectionId].order;
      highestOverlapSectionId = `main-${previousOrder}`;
    }
    return highestOverlapSectionId;
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
    if (currentLayout[targetSectionId]) {
      // this section already exists, so use the wrapper element to figure out target row
      const targetedGridSection = gridSectionElements[targetSectionId];
      const targetedGridSectionRect = targetedGridSection?.getBoundingClientRect();
      const targetedGridTop = targetedGridSectionRect?.top ?? 0;
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
  const hasChangedGridSection = targetSectionId !== lastSectionId;

  // resolve the new grid layout
  if (
    hasChangedGridSection ||
    !isGridDataEqual(requestedPanelData, lastRequestedPanelPosition.current)
  ) {
    lastRequestedPanelPosition.current = { ...requestedPanelData };

    const nextLayout = cloneDeep(currentLayout) ?? {};
    if (!nextLayout[targetSectionId]) {
      // section doesn't exist, so add it
      const { order: nextOrder } =
        targetSectionId === 'main-0' ? { order: 0 } : nextLayout[previousSection!];

      // push other sections down
      Object.keys(nextLayout).forEach((sectionId) => {
        if (nextLayout[sectionId].order > nextOrder) {
          nextLayout[sectionId].order += 1;
        }
      });
      // add the new section
      nextLayout[targetSectionId] = {
        id: targetSectionId,
        isMainSection: true,
        panels: {},
        order: nextOrder + 1,
      };
      requestedPanelData.row = 0;
    }

    // remove the panel from where it started so that we can apply the drag request
    delete nextLayout[lastSectionId].panels[activePanel.id];

    // resolve destination grid
    const destinationGrid = nextLayout[targetSectionId] as unknown as GridSectionData;
    const resolvedDestinationGrid = resolveGridSection(destinationGrid.panels, requestedPanelData);
    (nextLayout[targetSectionId] as unknown as GridSectionData).panels = resolvedDestinationGrid;

    // resolve origin grid
    if (hasChangedGridSection) {
      const originGrid = nextLayout[lastSectionId] as unknown as GridSectionData;
      const resolvedOriginGrid = resolveGridSection(originGrid.panels);
      (nextLayout[lastSectionId] as unknown as GridSectionData).panels = resolvedOriginGrid;

      if (
        nextLayout[lastSectionId].isMainSection &&
        !Object.keys(nextLayout[lastSectionId].panels).length
      ) {
        // delete empty main section rows
        const { order: prevOrder } = nextLayout[lastSectionId];
        delete nextLayout[lastSectionId];
        // push other sections up
        Object.keys(nextLayout).forEach((sectionId) => {
          if (nextLayout[sectionId].order > prevOrder) {
            nextLayout[sectionId].order -= 1;
          }
        });
      }
    }
    if (currentLayout && !isOrderedLayoutEqual(currentLayout, nextLayout)) {
      gridLayout$.next(nextLayout);
    }
  }

  // re-render the active panel
  activePanel$.next({
    ...activePanel,
    id: activePanel.id,
    position: previewRect,
    targetRow: targetSectionId,
  });
};

export const commitAction = ({ activePanel$, panelRefs }: GridLayoutStateManager) => {
  const event = activePanel$.getValue();
  activePanel$.next(undefined);
  startingLayout = undefined;

  if (!event) return;
  panelRefs.current[event.id]?.scrollIntoView({
    behavior: 'smooth',
    block: 'center',
  });
};

export const cancelAction = ({ activePanel$, gridLayout$, panelRefs }: GridLayoutStateManager) => {
  const event = activePanel$.getValue();
  activePanel$.next(undefined);
  if (startingLayout) {
    gridLayout$.next(startingLayout);
    startingLayout = undefined;
  }
  if (!event) return;
  panelRefs.current[event.id]?.scrollIntoView({
    behavior: 'smooth',
    block: 'center',
  });
};
