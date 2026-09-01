/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isIgnoredElement } from './is_ignored_element';
import { MEASURE_OVERLAY_ID } from '../constants';

/**
 * Get the deepest element at the given mouse event's coordinates.
 * Returns the most specific DOM element for precise measurements.
 *
 * For SVG elements, the nearest ancestor HTMLElement is returned so
 * that callers can safely use HTMLElement-specific APIs.
 *
 * The measure overlay uses `pointer-events: auto` to block hover on
 * underlying elements. We temporarily hide it so `elementsFromPoint`
 * can see through to the page content.
 *
 * @param event - The mouse event with coordinates.
 * @returns The deepest HTMLElement at the coordinates, or `null`.
 */
export const getElementFromPoint = (event: MouseEvent): HTMLElement | null => {
  const overlay = document.getElementById(MEASURE_OVERLAY_ID);
  if (overlay) {
    overlay.style.pointerEvents = 'none';
  }
  const elements = document.elementsFromPoint(event.clientX, event.clientY);
  if (overlay) {
    overlay.style.pointerEvents = '';
  }

  for (const el of elements) {
    if (isIgnoredElement(el)) continue;

    if (el instanceof HTMLElement) {
      if (getComputedStyle(el).visibility === 'hidden') continue;
      return el;
    }

    if (el instanceof SVGElement) {
      // SVGElement is not HTMLElement. Walk up to find the nearest
      // HTMLElement ancestor so the return type is sound.
      const svg = el.closest('svg');
      const ancestor = svg?.parentElement ?? el.ownerSVGElement?.parentElement ?? null;
      if (ancestor instanceof HTMLElement) return ancestor;
      continue;
    }
  }

  return null;
};
