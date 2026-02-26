/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TimeRange, InitialFocus } from './types';

/**
 * Check a time range is valid
 */
export function isValidTimeRange(range: TimeRange): boolean {
  const { startDate, endDate } = range;
  // both dates are valid
  if (startDate === null || endDate === null) {
    return false;
  }
  // start must be before or equal to end
  return startDate.getTime() <= endDate.getTime();
}

/**
 * Resolve the `initialFocus` target within the panel.
 * A string is treated as a CSS selector; a ref as a direct element handle.
 * Falls back to the panel div itself when unset.
 */
export function resolveInitialFocus(
  panelRef: React.RefObject<HTMLDivElement>,
  initialFocus?: InitialFocus
): HTMLElement | null {
  if (typeof initialFocus === 'string') {
    return panelRef.current?.querySelector<HTMLElement>(initialFocus) ?? null;
  }
  if (initialFocus && 'current' in initialFocus) {
    return initialFocus.current;
  }
  return panelRef.current;
}
