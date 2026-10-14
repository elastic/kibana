/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { MANAGED_ELEMENT_SELECTOR, DEVTOOL_HIDDEN_ATTR, DEVTOOL_MANAGED_ATTR } from '../constants';
import { isIgnoredElement } from './is_ignored_element';

/**
 * Finds the deepest targetable element at the given coordinates.
 * Managed elements are atomic: returns the root, not children.
 * Ignored UI elements block interaction (returns null).
 * Hidden originals are skipped.
 *
 * @param x - Pointer X coordinate.
 * @param y - Pointer Y coordinate.
 * @returns The targetable element, or `null`.
 */
export const getElementUnder = (x: number, y: number): HTMLElement | null => {
  const elements = document.elementsFromPoint(x, y);
  for (const el of elements) {
    if (!(el instanceof HTMLElement)) {
      // SVG elements are not HTMLElement. Check for a managed ancestor.
      const managed = el.closest?.(MANAGED_ELEMENT_SELECTOR) as HTMLElement | null;
      if (managed) return managed;
      continue;
    }
    if (el.hasAttribute(DEVTOOL_HIDDEN_ATTR) || el.closest(`[${DEVTOOL_HIDDEN_ATTR}]`)) continue;
    if (getComputedStyle(el).visibility === 'hidden') continue;
    if (isIgnoredElement(el)) {
      const isInsideAtomic = el.closest(MANAGED_ELEMENT_SELECTOR);
      if (!isInsideAtomic) return null;
      continue;
    }
    if (el.hasAttribute(DEVTOOL_MANAGED_ATTR)) return el;
    const atomicAncestor = el.closest(MANAGED_ELEMENT_SELECTOR) as HTMLElement | null;
    if (atomicAncestor) return atomicAncestor;
    return el;
  }
  return null;
};
