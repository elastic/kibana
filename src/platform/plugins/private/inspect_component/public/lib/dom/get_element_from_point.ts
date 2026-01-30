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
 * Get the topmost HTML element at the given mouse event's coordinates.
 * @param {MouseEvent} event The mouse event containing the coordinates.
 * @return {HTMLElement | null} The topmost inspectable HTML element at the event's coordinates, or null if none found.
 */
export const getElementFromPoint = (event: MouseEvent): HTMLElement | null => {
  const elements = document.elementsFromPoint(event.clientX, event.clientY);

  for (const el of elements) {
    const isSvg = el instanceof SVGElement;
    const isOverlay = el.id === INSPECT_OVERLAY_ID;
    const isPath = isSvg && el.tagName.toLowerCase() === 'path';
    const isNotInspectable = !(el instanceof HTMLElement) && !isSvg;

    if (isNotInspectable || isOverlay || isPath) continue;

    return isSvg ? el.parentElement : el;
  }

  return null;
};
