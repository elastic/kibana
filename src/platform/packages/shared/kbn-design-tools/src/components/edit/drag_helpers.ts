/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DEVTOOL_MANAGED_ATTR, DEVTOOL_HIDDEN_ATTR } from '../../lib/constants';
import { cloneClean, setImportant } from '../../lib/dom/clone_element';
import { snapToGrid } from '../../lib/dom/snap_to_grid';
import type { LayoutConfig } from '../../lib/layout/layout_config';
import type { ElementSession, ElementRegistry } from './element_registry';
import type { DragState } from './interaction_state';
import { buildTransform } from './resize_helpers';

/**
 * Begin dragging an existing managed element (re-grab).
 */
export const startDragFromSession = (
  session: ElementSession,
  clientX: number,
  clientY: number
): DragState => {
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

  const originalTransform = target.style.transform || '';
  target.setAttribute(DEVTOOL_HIDDEN_ATTR, originalTransform);
  target.style.visibility = 'hidden';
  target.style.pointerEvents = 'none';

  const session: ElementSession = {
    el: clone,
    dx: 0,
    dy: 0,
    dw: 0,
    dh: 0,
    originalRect: rect,
    isDuplicate: false,
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
 * Check if the target is a managed element and find its tracked session.
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
 * Apply a drag frame: computes translate with optional snap-to-grid and
 * writes the new offsets back to the session.
 */
export const applyDragMove = (
  state: DragState,
  clientX: number,
  clientY: number,
  shiftKey: boolean,
  options: {
    isLayoutVisible: boolean;
    layoutConfig: LayoutConfig;
    toolbarHeight: number;
  }
): void => {
  const { session, startX, startY, baseOffsetX, baseOffsetY } = state;
  const { originalRect, el } = session;
  const mouseDx = clientX - startX;
  const mouseDy = clientY - startY;
  let dx = baseOffsetX + mouseDx;
  let dy = baseOffsetY + mouseDy;

  if (!shiftKey && options.isLayoutVisible) {
    const snapped = snapToGrid(
      dx,
      dy,
      originalRect.left,
      originalRect.top,
      options.layoutConfig,
      window.innerWidth,
      window.innerHeight - options.toolbarHeight
    );
    dx = snapped.dx;
    dy = snapped.dy;
  }

  const scaleX = (originalRect.width + session.dw) / originalRect.width;
  const scaleY = (originalRect.height + session.dh) / originalRect.height;
  const newTransform = buildTransform(dx, dy, scaleX, scaleY);
  setImportant(el, 'transform', newTransform);

  session.dx = dx;
  session.dy = dy;
};
