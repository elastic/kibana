/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DEVTOOL_MANAGED_ATTR, DEVELOPER_TOOLBAR_HEIGHT } from '../lib/constants';
import { cloneClean, softHideElement } from './clone_element';
import { setImportant } from '../lib/dom/set_important';
import { snapToGrid } from '../lib/dom/snap_to_grid';
import type { LayoutConfig } from '../lib/layout/layout_config';
import type { ElementSession, ElementRegistry } from './element_registry';
import type { DragState } from './interaction_state';
import { buildTransform } from './resize_helpers';

/**
 * Closes portaled EUI popovers inside an element.
 *
 * EUI renders popover panels as portals on `document.body`, so they stay
 * anchored to the old position when the element moves or is removed.
 * This detaches any such panels and collapses the controlling toggle.
 *
 * @param el - The element whose portaled popovers should be closed.
 */
export const closePortaledPopovers = (el: HTMLElement): void => {
  const expandedToggles = el.querySelectorAll<HTMLElement>('[aria-expanded="true"]');
  for (const toggle of expandedToggles) {
    const controlsId = toggle.getAttribute('aria-controls');
    if (!controlsId) continue;

    const escapedId = CSS.escape(controlsId);
    if (el.querySelector(`#${escapedId}`)) continue;

    const panel = document.getElementById(controlsId);
    if (panel) {
      panel.remove();
      toggle.setAttribute('aria-expanded', 'false');
    }
  }
};

/**
 * Initiates a drag interaction from an existing tracked session.
 *
 * @param session - The tracked element session to drag.
 * @param clientX - Pointer X at drag start.
 * @param clientY - Pointer Y at drag start.
 * @returns The initial drag state.
 */
export const startDragFromSession = (
  session: ElementSession,
  clientX: number,
  clientY: number
): DragState => {
  closePortaledPopovers(session.el);

  session.el.style.pointerEvents = 'none';
  session.el.style.willChange = 'transform';

  return {
    type: 'drag',
    session,
    startX: clientX,
    startY: clientY,
    baseOffsetX: session.dx,
    baseOffsetY: session.dy,
  };
};

/**
 * Begin dragging a new element for the first time.
 *
 * @param target - The original DOM element to drag.
 * @param registry - The element registry to track the session.
 * @param cloneZIndex - The z-index for the cloned element.
 * @param clientX - Pointer X at drag start.
 * @param clientY - Pointer Y at drag start.
 * @returns The initial drag state.
 */
export const startDragFromElement = (
  target: HTMLElement,
  registry: ElementRegistry,
  cloneZIndex: number,
  clientX: number,
  clientY: number
): DragState => {
  const { clone, rect } = cloneClean(target, cloneZIndex);

  clone.style.transformOrigin = '0 0';
  document.body.appendChild(clone);

  softHideElement(target);

  const session: ElementSession = {
    el: clone,
    dx: 0,
    dy: 0,
    dw: 0,
    dh: 0,
    originalRect: rect,
    isDuplicate: false,
    referenceEl: target,
    styleEdits: [],
    textEdits: [],
    mediaEdits: [],
  };
  registry.set(session);

  return {
    type: 'drag',
    session,
    startX: clientX,
    startY: clientY,
    baseOffsetX: 0,
    baseOffsetY: 0,
  };
};

/**
 * Checks if the target is a managed element and finds its tracked session.
 *
 * @param target - The element to check.
 * @param registry - The element registry to search.
 * @returns The matching session, or `null` if not managed.
 */
export const findManagedSession = (
  target: HTMLElement,
  registry: ElementRegistry
): ElementSession | null => {
  if (!target.hasAttribute(DEVTOOL_MANAGED_ATTR)) {
    return null;
  }
  return registry.get(target) ?? null;
};

/**
 * Applies a drag frame: computes translate with optional snap-to-grid and
 * writes the new offsets back to the session.
 *
 * @param state - The current drag state.
 * @param clientX - Current pointer X.
 * @param clientY - Current pointer Y.
 * @param shiftKey - Whether shift is held (disables snap-to-grid).
 * @param options - Layout visibility and config for snap-to-grid.
 */
export const applyDragMove = (
  state: DragState,
  clientX: number,
  clientY: number,
  shiftKey: boolean,
  options: {
    isLayoutVisible: boolean;
    layoutConfig: LayoutConfig;
  }
): void => {
  const { session, startX, startY, baseOffsetX, baseOffsetY } = state;
  const { originalRect, el } = session;
  const mouseDx = clientX - startX;
  const mouseDy = clientY - startY;
  let dx = baseOffsetX + mouseDx;
  let dy = baseOffsetY + mouseDy;

  const shouldSnapToGrid = !shiftKey && options.isLayoutVisible;
  if (shouldSnapToGrid) {
    const snapped = snapToGrid(
      dx,
      dy,
      originalRect.left,
      originalRect.top,
      options.layoutConfig,
      window.innerWidth,
      window.innerHeight - DEVELOPER_TOOLBAR_HEIGHT
    );
    dx = snapped.dx;
    dy = snapped.dy;
  }

  const scaleX = originalRect.width ? (originalRect.width + session.dw) / originalRect.width : 1;
  const scaleY = originalRect.height ? (originalRect.height + session.dh) / originalRect.height : 1;
  const newTransform = buildTransform(dx, dy, scaleX, scaleY);
  setImportant(el, 'transform', newTransform);

  session.dx = dx;
  session.dy = dy;
};
