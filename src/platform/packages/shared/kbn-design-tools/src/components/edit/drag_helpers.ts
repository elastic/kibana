/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DEVTOOL_CLONE_ATTR } from '../../lib/constants';
import { cloneElement } from '../../lib/dom/clone_element';
import type { ElementSession, ElementRegistry } from './element_registry';
import type { DragState } from './interaction_state';

/**
 * Begin dragging an existing clone (re-grab).
 * Disables pointer events on the clone so it doesn't interfere with hit-testing during drag.
 */
export const startDragFromClone = (
  session: ElementSession,
  clientX: number,
  clientY: number
): DragState => {
  const clone = session.clone!;
  clone.style.pointerEvents = 'none';
  clone.style.willChange = 'transform';

  return {
    type: 'drag',
    el: session.el,
    clone,
    startX: clientX,
    startY: clientY,
    baseOffsetX: session.dx,
    baseOffsetY: session.dy,
    originalRect: session.originalRect,
  };
};

/**
 * Begin dragging a new element for the first time.
 * Creates a fixed-position clone, hides the original, and tracks it in the registry.
 */
export const startDragFromElement = (
  target: HTMLElement,
  registry: ElementRegistry,
  cloneZIndex: number,
  clientX: number,
  clientY: number
): DragState => {
  let session = registry.get(target);

  if (!session) {
    session = {
      el: target,
      clone: null,
      dx: 0,
      dy: 0,
      dw: 0,
      dh: 0,
      originalTransform: target.style.transform || '',
      originalRect: target.getBoundingClientRect(),
    };
    registry.set(session);
  } else if (session.clone) {
    session.clone.remove();
    registry.setClone(session, null);
  }

  // Clone lives on document.body so it's above all stacking contexts
  const { clone, rect } = cloneElement(target, cloneZIndex);
  // Set transform-origin for consistent scale behavior during resize
  clone.style.transformOrigin = '0 0';
  document.body.appendChild(clone);

  // Hide original but preserve layout space; block pointer events
  // so it doesn't trigger hover or hit-testing.
  target.style.visibility = 'hidden';
  target.style.pointerEvents = 'none';

  // Keep the original rect stable across re-grabs for snap calculations
  session.originalRect = rect;

  return {
    type: 'drag',
    el: target,
    clone,
    startX: clientX,
    startY: clientY,
    baseOffsetX: session.dx,
    baseOffsetY: session.dy,
    originalRect: rect,
  };
};

/**
 * Check if the target is an existing clone and find its tracked session.
 */
export const findExistingClone = (
  target: HTMLElement,
  registry: ElementRegistry
): ElementSession | null => {
  if (!target.hasAttribute(DEVTOOL_CLONE_ATTR)) return null;
  return registry.getByClone(target) ?? null;
};
