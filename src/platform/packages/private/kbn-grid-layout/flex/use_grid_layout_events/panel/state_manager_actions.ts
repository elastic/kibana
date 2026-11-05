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
import { CONFIRM_BUTTON } from '@elastic/eui/src/components/modal/confirm_modal';

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
  const gridLayoutRect = gridLayoutElement?.getBoundingClientRect();

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

  const requestedPanelData = { ...currentPanelData };
  const numberOfRows = Math.floor(
    ((gridLayoutRect?.bottom ?? 0) - (gridLayoutRect?.top ?? 0)) / (rowHeight + gutterSize / 2)
  );

  const getRow = (rect: { top: number; bottom: number }) => {
    // this section already exists, so use the wrapper element to figure out target row
    const gridTop = gridLayoutRect?.top ?? 0;
    const localYCoordinate = (rect.top ?? 0) - gridTop;
    return Math.min(
      Math.max(Math.ceil(localYCoordinate / (rowHeight + gutterSize / 2)), 1),
      numberOfRows
    );
  };

  if (isResize) {
    const targetWidth = previewRect.right - previewRect.left;
    requestedPanelData.width = Math.max(targetWidth, 1);
    if (!isEqual(requestedPanelData, lastRequestedPanelPosition.current)) {
      lastRequestedPanelPosition.current = { ...requestedPanelData };

      let nextLayout = cloneDeep(currentLayout) ?? {};
      delete nextLayout[activePanel.id];
      nextLayout[requestedPanelData.id] = requestedPanelData;

      gridLayout$.next(nextLayout);
    }
  } else {
    const sorted = Object.entries(panelElements)
      .map(([id, panel]) => {
        const comparison = panel?.getBoundingClientRect();
        const row = getRow(comparison);
        return {
          id,
          ...(comparison ?? { left: 0 }),
          row,
          test: (comparison?.left ?? 0) + row * (gridLayoutRect?.width ?? 1),
        };
      })
      .sort((a, b) => {
        return a.test - b.test;
        // if (a.row === b.row) return a.left - b.left;
        // return a.row - b.row;
      });

    const nextLayout: FlexLayoutData = {};
    sorted.forEach(({ id }, index) => {
      nextLayout[id] = { ...currentLayout[id], order: index };
    });
    gridLayout$.next(nextLayout);
  }

  // re-render the active panel
  activePanelEvent$.next({
    ...activePanel,
    id: activePanel.id,
    position: previewRect,
  });
};

export const commitAction = ({ activePanelEvent$, panelRefs }: FlexLayoutStateManager) => {
  const event = activePanelEvent$.getValue();
  activePanelEvent$.next(undefined);
  if (!event) return;

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
