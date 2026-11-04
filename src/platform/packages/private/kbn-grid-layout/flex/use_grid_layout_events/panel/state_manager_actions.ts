/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { cloneDeep, isEqual } from 'lodash';
import type { MutableRefObject } from 'react';

import type { ActivePanelEvent, FlexPanelData } from '../../grid_panel';
import type { FlexLayoutData, FlexLayoutStateManager } from '../../types';
import type { GridLayoutContextType } from '../../use_grid_layout_context';
import { getSensorType } from '../sensors';
import type { PointerPosition, UserInteractionEvent } from '../types';
import { getDragPreviewRect, getResizePreviewRect, getSensorOffsets } from './utils';

let startingLayout: FlexLayoutData | undefined;

export const startAction = (
  e: UserInteractionEvent,
  type: ActivePanelEvent['type'],
  gridLayoutStateManager: FlexLayoutStateManager,
  sectionId: string | undefined,
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
  lastRequestedPanelPosition: MutableRefObject<FlexPanelData | undefined>
) => {
  const {
    runtimeSettings$: { value: runtimeSettings },
    activePanelEvent$,
    gridLayout$,
    panelRefs: { current: panelElements },
    layoutRef: { current: gridLayoutElement },
  } = gridLayoutStateManager;
  const activePanel = activePanelEvent$.value;
  const currentLayout = gridLayout$.value;
  if (!activePanel || !runtimeSettings || !currentLayout) {
    // if no interaction event return early
    return;
  }
  const currentPanelData = currentLayout[activePanel.id];
  if (!currentPanelData) {
    return;
  }

  const { columnCount, gutterSize, rowHeight, columnPixelWidth } = runtimeSettings;
  const isResize = activePanel.type === 'resize';

  const previewRect = (() => {
    if (isResize) {
      const { resizeOptions } = currentPanelData;
      const maxRight = gridLayoutElement
        ? gridLayoutElement.getBoundingClientRect().right
        : window.innerWidth;
      return getResizePreviewRect({
        activePanel,
        pointerPixel,
        runtimeSettings,
        resizeOptions,
        maxRight,
      });
    } else {
      return getDragPreviewRect({ activePanel, pointerPixel });
    }
  })();

  // calculate the requested grid position
  const gridLayoutRect = gridLayoutElement?.getBoundingClientRect();
  // const targetWidth = (() => {
  //   const targetedGridLeft = gridLayoutRect?.left ?? 0;
  //   const localXCoordinate = isResize
  //     ? previewRect.right - targetedGridLeft
  //     : previewRect.left - targetedGridLeft;
  //   return localXCoordinate;
  //   // const maxColumn = isResize ? columnCount : columnCount - currentPanelData.width;
  //   // return Math.min(
  //   //   Math.max(Math.round(localXCoordinate / (columnPixelWidth + gutterSize)), 0),
  //   //   maxColumn
  //   // );
  // })();

  // console.log({ targetColumn: targetWidth });

  const requestedPanelData = { ...currentPanelData };
  if (isResize) {
    const targetWidth = previewRect.right - previewRect.left;
    requestedPanelData.width = Math.max(targetWidth, 1);
  } else {
    // TODO: Determine order
    // requestedPanelData.order = targetWidth;
  }
  console.log({ requestedPanelData, tessxt: lastRequestedPanelPosition.current });

  // resolve the new grid layout
  if (!isEqual(requestedPanelData, lastRequestedPanelPosition.current)) {
    lastRequestedPanelPosition.current = { ...requestedPanelData };

    let nextLayout = cloneDeep(currentLayout) ?? {};

    // remove the panel from where it started so that we can apply the drag request
    delete nextLayout[activePanel.id];
    nextLayout[requestedPanelData.id] = requestedPanelData;

    // resolve grid
    // const resolvedDestinationGrid = resolveLayout(nextLayout.panels, requestedPanelData);
    // nextLayout[targetSectionId].panels = resolvedDestinationGrid;

    // // resolve sections to remove empty main sections + ensure orders are valid
    // nextLayout = resolveSections(nextLayout);
    // if (!nextLayout[targetSectionId]) {
    //   // resolving the sections possibly removed + renamed sections, so reset target section
    //   const { order } = nextLayout[previousSection!];
    //   targetSectionId = `main-${order + 1}`;
    // }

    // if (currentLayout && !isOrderedLayoutEqual(currentLayout, nextLayout)) {
    console.log('!!!!!!!!!!!!!!!!!', { nextLayout, panelElements });
    gridLayout$.next(nextLayout);
    // }
  }

  // re-render the active panel
  activePanelEvent$.next({
    ...activePanel,
    id: activePanel.id,
    position: previewRect,
  });
};

const resolveLayout = (
  originalLayout: FlexLayoutData,
  dragRequest: FlexPanelData
): FlexLayoutData => {};

export const commitAction = ({ activePanelEvent$, panelRefs }: FlexLayoutStateManager) => {
  const event = activePanelEvent$.getValue();
  activePanelEvent$.next(undefined);

  if (!event) return;
  console.log('!!!!!!!', { event });
  panelRefs.current[event.id]?.scrollIntoView({
    behavior: 'smooth',
    block: 'nearest',
  });
};

export const cancelAction = ({
  activePanelEvent$,
  gridLayout$,
  panelRefs,
}: FlexLayoutStateManager) => {
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
