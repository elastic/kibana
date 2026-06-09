/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useRef } from 'react';

/**
 * Locks a target element so that it remains stable even when CSS :hover effects
 * cause hit-testing to briefly report a parent element. Only updates the locked
 * target when the new candidate is a child or unrelated element, never when it
 * is an ancestor of the currently locked target.
 *
 * Uses a ref instead of state to avoid an extra re-render on every
 * pointer-move (the candidate changes at pointer-move frequency).
 */
export const useLockedTarget = (
  candidate: HTMLElement | null,
  active: boolean
): HTMLElement | null => {
  const lockedRef = useRef<HTMLElement | null>(null);

  if (active && candidate) {
    if (!lockedRef.current || !candidate.contains(lockedRef.current)) {
      lockedRef.current = candidate;
    }
  } else {
    lockedRef.current = null;
  }

  return lockedRef.current;
};
