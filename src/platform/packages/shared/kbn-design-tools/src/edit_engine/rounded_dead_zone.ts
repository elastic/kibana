/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EDGE_ZONE, ROUNDING_THRESHOLD } from '../lib/constants';

/**
 * Check whether an element has any corner with a border-radius above the
 * threshold. Handles `%`, elliptical, and per-corner values correctly.
 *
 * @param el - The element to inspect.
 * @returns Whether any corner has significant rounding.
 */
export const hasSignificantRounding = (el: HTMLElement): boolean => {
  const computed = getComputedStyle(el);
  const radii = [
    computed.borderTopLeftRadius,
    computed.borderTopRightRadius,
    computed.borderBottomRightRadius,
    computed.borderBottomLeftRadius,
  ];
  return radii.some((r) => {
    const value = parseFloat(r);
    return Number.isFinite(value) && value > ROUNDING_THRESHOLD;
  });
};

/**
 * Returns `true` when the pointer is inside an element's bounding rect but
 * near its edges. Covers the "dead zone" between a rounded hit-test shape and the
 * rectangular bounding box where resize handles live.
 *
 * @param x - Pointer X coordinate.
 * @param y - Pointer Y coordinate.
 * @param rect - The element's bounding rect.
 * @returns Whether the pointer is in the rounded dead zone.
 */
export const isInRoundedDeadZone = (x: number, y: number, rect: DOMRect): boolean => {
  const inBounds = x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
  if (!inBounds) return false;

  return (
    x <= rect.left + EDGE_ZONE ||
    x >= rect.right - EDGE_ZONE ||
    y <= rect.top + EDGE_ZONE ||
    y >= rect.bottom - EDGE_ZONE
  );
};
