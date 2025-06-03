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

import type { ActivePanelEvent, GridPanelData } from '../../grid_panel';
import type { GridLayoutStateManager, OrderedLayout } from '../../types';
import type { GridLayoutContextType } from '../../use_grid_layout_context';
import { isGridDataEqual, isOrderedLayoutEqual } from '../../utils/equality_checks';
import { resolveGridSection } from '../../utils/resolve_grid_section';
import { resolveSections } from '../../utils/section_management';
import { getSensorType } from '../sensors';
import type { PointerPosition, UserInteractionEvent } from '../types';
import { getDragPreviewRect, getResizePreviewRect, getSensorOffsets } from './utils';

let startingLayout: OrderedLayout | undefined;

export const startAction = (
  e: UserInteractionEvent,
  type: ActivePanelEvent['type'],
  gridLayoutStateManager: GridLayoutStateManager,
  sectionId: string,
  panelId: string
) => {
  const panelRef = gridLayoutStateManager.panelRefs.current[panelId];
  if (!panelRef) return;

  startingLayout = gridLayoutStateManager.gridLayout$.getValue();
  const panelRect = panelRef.getBoundingClientRect();
  gridLayoutStateManager.activePanelEvent$.next({
    type,
    id: panelId,
    panelDiv: panelRef,
    targetSection: sectionId,
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
    activePanelEvent$,
    gridLayout$,
    layoutRef: { current: gridLayoutElement },
    headerRefs: { current: gridHeaderElements },
    sectionRefs: { current: gridSectionElements },
  } = gridLayoutStateManager;
  const activePanel = activePanelEvent$.value;
  const currentLayout = gridLayout$.value;
  if (!activePanel || !runtimeSettings || !gridSectionElements || !currentLayout) {
    // if no interaction event return early
    return;
  }
  const currentPanelData = currentLayout[activePanel.targetSection].panels[activePanel.id];
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
  const lastSectionId = activePanel.targetSection;
  let previousSection;
  let targetSectionId: string | undefined = (() => {
    if (isResize) return lastSectionId;
    const layoutRect = gridLayoutElement?.getBoundingClientRect();
    // early returns for edge cases
    if (previewRect.top < (layoutRect?.top ?? 0)) {
      // target the first "main" section if the panel is dragged above the layout element
      return `main-0`;
    } else if (previewRect.top > (layoutRect?.bottom ?? Infinity)) {
      // target the last "main" section if the panel is dragged below the layout element
      const sections = Object.values(currentLayout);
      const maxOrder = sections.length - 1;
      previousSection = sections.filter(({ order }) => order === maxOrder)[0].id;
      return `main-${maxOrder}`;
    }

    const previewBottom = previewRect.top + rowHeight;
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
      // skip past collapsed section
      return undefined;
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
    if (targetSectionId) {
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

    let nextLayout = cloneDeep(currentLayout) ?? {};

    if (!targetSectionId || !nextLayout[targetSectionId]) {
      // section doesn't exist, so add it
      const { order: nextOrder } =
        targetSectionId === 'main-0' ? { order: -1 } : nextLayout[previousSection!];

      // push other sections down
      Object.keys(nextLayout).forEach((sectionId) => {
        if (nextLayout[sectionId].order > nextOrder) {
          nextLayout[sectionId].order += 1;
        }
      });
      // add the new section, which may be renamed by `resolveSections` to `main-<order>`
      targetSectionId = targetSectionId ?? `main-new`;
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
    const destinationGrid = nextLayout[targetSectionId];
    const resolvedDestinationGrid = resolveGridSection(destinationGrid.panels, requestedPanelData);
    nextLayout[targetSectionId].panels = resolvedDestinationGrid;

    // resolve origin grid
    if (hasChangedGridSection) {
      const originGrid = nextLayout[lastSectionId];
      const resolvedOriginGrid = resolveGridSection(originGrid.panels);
      nextLayout[lastSectionId].panels = resolvedOriginGrid;
    }

    // resolve sections to remove empty main sections + ensure orders are valid
    nextLayout = resolveSections(nextLayout);
    if (!nextLayout[targetSectionId]) {
      // resolving the sections possibly removed + renamed sections, so reset target section
      const { order } = nextLayout[previousSection!];
      targetSectionId = `main-${order + 1}`;
    }

    if (currentLayout && !isOrderedLayoutEqual(currentLayout, nextLayout)) {
      gridLayout$.next(nextLayout);
    }
  }

  // re-render the active panel
  activePanelEvent$.next({
    ...activePanel,
    id: activePanel.id,
    position: previewRect,
    targetSection: targetSectionId!,
  });
};

export const commitAction = ({
  activePanelEvent$: activePanelEvent$,
  panelRefs,
}: GridLayoutStateManager) => {
  const event = activePanelEvent$.getValue();
  activePanelEvent$.next(undefined);

  if (!event) return;
  panelRefs.current[event.id]?.scrollIntoView({
    behavior: 'smooth',
    block: 'center',
  });
};

export const cancelAction = ({
  activePanelEvent$: activePanelEvent$,
  gridLayout$,
  panelRefs,
}: GridLayoutStateManager) => {
  const event = activePanelEvent$.getValue();
  activePanelEvent$.next(undefined);
  if (startingLayout) {
    gridLayout$.next(startingLayout);
  }

  if (!event) return;
  panelRefs.current[event.id]?.scrollIntoView({
    behavior: 'smooth',
    block: 'center',
  });
};
