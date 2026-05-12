/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { MEASURE_OVERLAY_ID } from '../constants';

/**
 * Get the deepest element at the given mouse event's coordinates.
 * Returns the most specific DOM element for precise measurements.
 */
export const getElementFromPoint = (event: MouseEvent): HTMLElement | null => {
  const elements = document.elementsFromPoint(event.clientX, event.clientY);

  for (const el of elements) {
    const isOverlay = el.id === MEASURE_OVERLAY_ID;

    if (isOverlay) continue;

    if (el instanceof HTMLElement) {
      return el;
    }

    if (el instanceof SVGElement) {
      return (el.closest('svg') as unknown as HTMLElement) ?? el.ownerSVGElement ?? null;
    }
  }

  return null;
};
