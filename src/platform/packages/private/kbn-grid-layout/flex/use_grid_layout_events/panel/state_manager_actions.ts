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
import { getDragPreviewRect, getSensorOffsets } from '../../../common/utils';

import type { ActivePanelEvent, FlexPanelData } from '../../panel';
import type { FlexLayoutData, FlexLayoutStateManager } from '../../types';
import type { GridLayoutContextType } from '../../use_grid_layout_context';
import { getSensorType } from '../../../common/sensors';
import type { PointerPosition, UserInteractionEvent } from '../../../common/types';
import { getPanelKeysInOrder } from '../../utils/panel_order';
import type { UserKeyboardEvent } from '../../../common/sensors/keyboard/types';
import { getAllowedBreakpoints, getKeyboardDragPosition, getResizePreviewRect } from './utils';

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

/** Moves the keyboard-dragged panel by changing its `order` directly, so it stays in the flow. */
export const moveKeyboardDragAction = (
  ev: UserKeyboardEvent,
  { gridLayout$, gridSettings$, panelRefs, activePanelEvent$ }: FlexLayoutStateManager
) => {
  const activePanel = activePanelEvent$.value;
  const layout = gridLayout$.value;
  if (!activePanel || !layout?.[activePanel.id]) return;

  const ids = getPanelKeysInOrder(layout);
  const from = ids.indexOf(activePanel.id);
  const to = getKeyboardDragPosition({
    code: ev.code,
    ids,
    activeId: activePanel.id,
    getRect: (id) => panelRefs.current[id]?.getBoundingClientRect(),
    rowHeight: gridSettings$.value.rowHeight,
  });
  if (to === from) return;

  ids.splice(to, 0, ...ids.splice(from, 1));
  const nextLayout: FlexLayoutData = {};
  ids.forEach((id, order) => {
    nextLayout[id] = { ...layout[id], order };
  });
  gridLayout$.next(nextLayout);
  // the first move is what makes the panel visibly active (see `panel.tsx`)
  activePanelEvent$.next({ ...activePanel });

  panelRefs.current[activePanel.id]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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
      const containerWidth = gridLayoutRect?.width ?? window.innerWidth;
      return getResizePreviewRect({
        activePanel,
        pointerPixel,
        resizeOptions,
        usableWidth: containerWidth - gutterSize * 2,
      });
    } else {
      return getDragPreviewRect({ activePanel, pointerPixel });
    }
  })();

  const requestedPanelData = { ...currentPanelData };
  const rowSize = rowHeight + gutterSize / 2;
  const gridTop = gridLayoutRect?.top ?? 0;
  const getRow = ({ top }: { top: number }) => Math.ceil((top - gridTop) / rowSize);

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
    const getSortKey = (rect: { top: number; bottom: number; left: number }) =>
      rect.left + getRow(rect) * (gridLayoutRect?.width ?? 1);

    // Full-width panels can produce identical sort keys; break ties using the drag direction so
    // the active panel passes over the panel it lands on instead of keeping its original order.
    const movedForward = getSortKey(previewRect) >= getSortKey(activePanel.position);

    const sorted = Object.entries(panelElements)
      .map(([id, panel]) => {
        // the active panel's DOM position isn't updated until `activePanelEvent$.next()` below,
        // so use the up-to-date preview rect rather than the stale DOM measurement
        const rect =
          id === activePanel.id
            ? previewRect
            : panel?.getBoundingClientRect() ?? { top: 0, bottom: 0, left: 0 };
        return { id, sortKey: getSortKey(rect) };
      })
      .sort((a, b) => {
        if (a.sortKey !== b.sortKey) return a.sortKey - b.sortKey;
        const activeId = activePanel.id;
        if (a.id === activeId) return movedForward ? 1 : -1;
        if (b.id === activeId) return movedForward ? -1 : 1;
        return 0;
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

const snapToBreakpoint = (
  width: number,
  breakpoints: number[],
  resizeOptions: FlexPanelData['resizeOptions']
): number => {
  // only snap to breakpoints that respect the panel's resize limits
  const allowed = getAllowedBreakpoints(breakpoints, resizeOptions);
  if (!allowed.length) return width;
  return allowed.reduce((closest, breakpoint) =>
    Math.abs(breakpoint - width) < Math.abs(closest - width) ? breakpoint : closest
  );
};

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
    const width = snapToBreakpoint(panel.width, widthBreakpoints, panel.resizeOptions);
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
