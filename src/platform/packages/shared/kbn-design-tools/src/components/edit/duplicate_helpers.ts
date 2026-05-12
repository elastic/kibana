/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DEVTOOL_CLONE_ATTR, DEVTOOL_DUPLICATE_ATTR, DUPLICATE_OFFSET } from '../../lib/constants';
import { cloneClean } from '../../lib/dom/clone_element';
import type { ElementSession, ElementRegistry } from './element_registry';
import { buildTransform } from './resize_helpers';

/**
 * Create a duplicate of the hovered element and register it in the registry.
 * Returns the new duplicate element so the caller can update hover state.
 */
export const createDuplicate = (
  hoverTarget: HTMLElement,
  registry: ElementRegistry,
  cloneZIndex: number
): HTMLElement => {
  // Resolve the session (if any) to determine the source element.
  const existingSession = registry.getByClone(hoverTarget) ?? registry.get(hoverTarget);

  // Always clone from the real source element (not a scaled clone) so the
  // internal structure has correct dimensions.
  const sourceEl = existingSession ? existingSession.el : hoverTarget;

  // Carry over resize deltas from the source session (if any).
  const sourceDw = existingSession?.dw ?? 0;
  const sourceDh = existingSession?.dh ?? 0;

  // Create a real DOM element from the source using cloneClean (which
  // faithfully copies computed styles, pseudo-elements, canvas content,
  // and handles save/restore of transform, display, visibility so we
  // get base dimensions and clean computed styles).
  const { clone: duplicate, rect } = cloneClean(sourceEl, cloneZIndex);
  duplicate.removeAttribute(DEVTOOL_CLONE_ATTR);
  duplicate.setAttribute(DEVTOOL_DUPLICATE_ATTR, '');
  duplicate.style.transformOrigin = '0 0';
  duplicate.style.pointerEvents = 'auto';
  document.body.appendChild(duplicate);

  // Position: if duplicating a clone, place at the clone's visual position.
  // Otherwise place at the source element's position.
  const sourceClone = existingSession?.clone;
  if (sourceClone) {
    const cloneRect = sourceClone.getBoundingClientRect();
    duplicate.style.left = `${cloneRect.left}px`;
    duplicate.style.top = `${cloneRect.top}px`;
  }

  // Apply resize scale + duplicate offset so the copy is visually identical
  // to the source but shifted to be distinguishable.
  const scaleX = (rect.width + sourceDw) / rect.width;
  const scaleY = (rect.height + sourceDh) / rect.height;
  const initialTransform = buildTransform(DUPLICATE_OFFSET, DUPLICATE_OFFSET, scaleX, scaleY);
  duplicate.style.transform = initialTransform;

  // Register the duplicate as an independent editable instance.
  const session: ElementSession = {
    el: duplicate,
    clone: null,
    dx: 0,
    dy: 0,
    dw: sourceDw,
    dh: sourceDh,
    originalTransform: initialTransform,
    originalRect: rect,
    isDuplicate: true,
  };
  registry.set(session);

  return duplicate;
};
