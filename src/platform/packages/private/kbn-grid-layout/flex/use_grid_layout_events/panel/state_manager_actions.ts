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
import { getSensorType } from '../../../grid/use_grid_layout_events/sensors';
import type {
  PointerPosition,
  UserInteractionEvent,
} from '../../../grid/use_grid_layout_events/types';
import { getDragPreviewRect, getResizePreviewRect, getSensorOffsets } from './utils';

let startingLayout: FlexLayoutData | undefined;

export const startAction = (
  e: UserInteractionEvent,
  type: ActivePanelEvent['type'],
  gridLayoutStateManager: FlexLayoutStateManager,
  panelId: string
) => {
  const panelRef = gridLayoutStateManager.panelRefs.current[panelId];
  if (!panelRef) return;

  startingLayout = gridLayoutStateManager.gridLayout$.getValue();
  const panelRect = panelRef.getBoundingClientRect();
  // measure every panel in a single read pass, before any styles change, so only one layout is forced
  const panelWidths =
    type === 'resize'
      ? Object.fromEntries(
          Object.entries(gridLayoutStateManager.panelRefs.current).flatMap(([id, element]) =>
            element ? [[id, element.getBoundingClientRect().width]] : []
          )
        )
      : undefined;
  gridLayoutStateManager.activePanelEvent$.next({
    type,
    id: panelId,
    panelDiv: panelRef,
    sensorType: getSensorType(e),
    position: panelRect,
    sensorOffsets: getSensorOffsets(e, panelRect),
    panelWidths,
  });
};

export const moveAction = (
  e: UserInteractionEvent,
  gridLayoutStateManager: GridLayoutContextType['gridLayoutStateManager'],
  pointerPixel: PointerPosition,
  lastRequestedPanelPosition: MutableRefObject<FlexPanelData | undefined>
) => {
  const {
    gridSettings$: { value: gridSettings },
    activePanelEvent$,
    gridLayout$,
    panelRefs: { current: panelElements },
    layoutRef: { current: gridLayoutElement },
  } = gridLayoutStateManager;
  const activePanel = activePanelEvent$.value;
  const currentLayout = gridLayout$.value;
  if (!activePanel || !gridSettings || !currentLayout) {
    // if no interaction event return early
    return;
  }
  const currentPanelData = currentLayout[activePanel.id];
  if (!currentPanelData) {
    return;
  }

  const { gutterSize, rowHeight } = gridSettings;
  const isResize = activePanel.type === 'resize';
  const gridLayoutRect = gridLayoutElement?.getBoundingClientRect();

  const previewRect = (() => {
    if (isResize) {
      const { resizeOptions } = currentPanelData;
      const maxRight = gridLayoutRect?.right ?? window.innerWidth;
      return getResizePreviewRect({
        activePanel,
        pointerPixel,
        gridSettings,
        resizeOptions,
        maxRight: maxRight - gutterSize,
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
    const gridTop = gridLayoutRect?.top ?? 0;
    const localYCoordinate = rect.top - gridTop;
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

      const nextLayout = cloneDeep(currentLayout) ?? {};
      delete nextLayout[activePanel.id];
      nextLayout[requestedPanelData.id] = requestedPanelData;

      gridLayout$.next(nextLayout);
    }
  } else {
    const sorted = Object.entries(panelElements)
      .map(([id, panel]) => {
        const rect = panel?.getBoundingClientRect() ?? { top: 0, bottom: 0, left: 0 };
        const row = getRow(rect);
        return { id, sortKey: rect.left + row * (gridLayoutRect?.width ?? 1) };
      })
      .sort((a, b) => a.sortKey - b.sortKey);

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

const snapToBreakpoint = (width: number, breakpoints: number[]): number =>
  breakpoints.reduce((closest, breakpoint) =>
    Math.abs(breakpoint - width) < Math.abs(closest - width) ? breakpoint : closest
  );

export const commitAction = ({
  activePanelEvent$,
  gridLayout$,
  gridSettings$,
  panelRefs,
}: FlexLayoutStateManager) => {
  const event = activePanelEvent$.getValue();
  if (!event) return;

  const { widthBreakpoints } = gridSettings$.getValue();
  const panel = gridLayout$.getValue()[event.id];
  if (event.type === 'resize' && panel && widthBreakpoints?.length) {
    const width = snapToBreakpoint(panel.width, widthBreakpoints);
    if (width !== panel.width) {
      gridLayout$.next({ ...gridLayout$.getValue(), [event.id]: { ...panel, width } });
    }
  }
  // clear the event after the layout is final so only the snapped layout is emitted
  activePanelEvent$.next(undefined);

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
  if (startingLayout) {
    gridLayout$.next(startingLayout);
  }
  activePanelEvent$.next(undefined);

  if (!event) return;
  panelRefs.current[event.id]?.scrollIntoView({
    behavior: 'smooth',
    block: 'center',
  });
};
