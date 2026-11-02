/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isIgnoredElement } from './is_ignored_element';
import { FONT_INSPECT_OVERLAY_ID, MEASURE_OVERLAY_ID } from '../constants';

const PEEK_THROUGH_OVERLAY_IDS = [MEASURE_OVERLAY_ID, FONT_INSPECT_OVERLAY_ID] as const;

const setOverlayPointerEvents = (pointerEvents: string): void => {
  for (const id of PEEK_THROUGH_OVERLAY_IDS) {
    const overlay = document.getElementById(id);
    if (overlay) {
      overlay.style.pointerEvents = pointerEvents;
    }
  }
};

/**
 * Get the deepest element at the given mouse event's coordinates.
 * Returns the most specific DOM element for precise measurements.
 *
 * For SVG elements, the nearest ancestor HTMLElement is returned so
 * that callers can safely use HTMLElement-specific APIs.
 *
 * Measure and font-inspect overlays currently use `pointer-events: none`,
 * but temporarily zeroing their `pointer-events` here keeps this safe even
 * if an overlay's backdrop reverts to blocking hover in the future.
 *
 * @param event - The mouse event with coordinates.
 * @returns The deepest HTMLElement at the coordinates, or `null`.
 */
export const getElementFromPoint = (event: MouseEvent): HTMLElement | null => {
  setOverlayPointerEvents('none');
  const elements = document.elementsFromPoint(event.clientX, event.clientY);
  setOverlayPointerEvents('');

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
