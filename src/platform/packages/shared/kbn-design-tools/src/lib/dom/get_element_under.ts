/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DEVTOOL_CLONE_ATTR } from '../constants';
import { isIgnoredElement } from './is_ignored_element';

export interface ElementOffset {
  el: HTMLElement;
  clone: HTMLElement | null;
  dx: number;
  dy: number;
  originalTransform: string;
}

/**
 * Find the deepest targetable element at the given coordinates.
 * Handles clone elements (data-devtool-clone), hidden originals, and ignored tool UI.
 *
 * - Clone elements and their children are valid targets (returned directly).
 * - Ignored elements (toolbar, popover, overlay) cause null to be returned
 *   so the event passes through naturally.
 * - Hidden elements and originals with living clones are skipped.
 */
export const getElementUnder = (
  x: number,
  y: number,
  movedElements: ElementOffset[]
): HTMLElement | null => {
  const elements = document.elementsFromPoint(x, y);
  for (const el of elements) {
    if (!(el instanceof HTMLElement)) continue;
    // Skip ignored structural elements (spacers, etc.) everywhere, including inside clones
    if (isIgnoredElement(el)) {
      // Tool UI elements (toolbar, overlay) block interaction — return null
      const isInsideClone = el.closest(`[${DEVTOOL_CLONE_ATTR}]`);
      if (!isInsideClone) return null;
      // Inside a clone, just skip this element and try the next one
      continue;
    }
    // Elements inside clones are valid targets — treat them like normal elements
    if (el.hasAttribute(DEVTOOL_CLONE_ATTR)) return el;
    const cloneAncestor = el.closest(`[${DEVTOOL_CLONE_ATTR}]`) as HTMLElement | null;
    if (cloneAncestor) return el;
    if (el instanceof HTMLElement) {
      // Skip hidden elements (e.g. originals that have a visible clone)
      if (el.style.visibility === 'hidden') continue;
      // Skip hidden originals that have a living clone
      const entry = movedElements.find((e) => e.el === el && e.clone);
      if (entry) continue;
      return el;
    }
  }
  return null;
};
