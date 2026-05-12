/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DEVTOOL_CLONE_ATTR, DEVTOOL_DUPLICATE_ATTR } from '../constants';

const ATOMIC_SELECTOR = `[${DEVTOOL_CLONE_ATTR}], [${DEVTOOL_DUPLICATE_ATTR}]`;
import { isIgnoredElement } from './is_ignored_element';

/**
 * Minimal view of a tracked element needed for hit-testing.
 */
export interface TrackedElement {
  el: HTMLElement;
  clone: HTMLElement | null;
}

/**
 * Extended tracked-element shape used by tests.
 * Production code should prefer TrackedElement or ElementSession.
 */
export interface ElementOffset {
  el: HTMLElement;
  clone: HTMLElement | null;
  dx: number;
  dy: number;
  /** Width delta from resize operations. */
  dw: number;
  /** Height delta from resize operations. */
  dh: number;
  originalTransform: string;
  originalRect: DOMRect;
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
  movedElements: ReadonlyArray<TrackedElement>
): HTMLElement | null => {
  const elements = document.elementsFromPoint(x, y);
  for (const el of elements) {
    if (!(el instanceof HTMLElement)) continue;
    // Skip ignored elements (spacers, toolbar, overlays) everywhere including inside clones/duplicates
    if (isIgnoredElement(el)) {
      // Tool UI elements (toolbar, overlay) block interaction — return null
      const isInsideAtomic = el.closest(ATOMIC_SELECTOR);
      if (!isInsideAtomic) return null;
      // Inside a clone/duplicate, just skip this element and try the next one
      continue;
    }
    // Clones and duplicates are atomic — return the root so callers
    // can match it against registry entries (children are not individually targetable).
    if (el.hasAttribute(DEVTOOL_CLONE_ATTR) || el.hasAttribute(DEVTOOL_DUPLICATE_ATTR)) return el;
    const atomicAncestor = el.closest(ATOMIC_SELECTOR) as HTMLElement | null;
    if (atomicAncestor) return atomicAncestor;
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
