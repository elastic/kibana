/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { INSPECT_OVERLAY_ID } from '../constants';

/**
 * Get the topmost DOM element at the given pointer event's coordinates, ignoring inspect overlay and non-inspectable
 * elements.
 * @param {MouseEvent} event The mouse event containing the coordinates.
 * @return {HTMLElement | null} The topmost inspectable DOM element at the event's coordinates, or undefined if none found.
 */
export const getElementFromPoint = (event: MouseEvent): HTMLElement | null => {
  const elements = document.elementsFromPoint(event.clientX, event.clientY);

  for (const el of elements) {
    const isSvg = el instanceof SVGElement;
    const isOverlay = el.id === INSPECT_OVERLAY_ID;
    const isPath = isSvg && el.tagName.toLowerCase() === 'path';
    /** There is some edge case with SVG elements that are not inspectable. */
    const isNotInspectable = !(el instanceof HTMLElement) && !isSvg;

    if (isNotInspectable || isOverlay || isPath) continue;

    return isSvg ? el.parentElement : el;
  }

  return null;
};
