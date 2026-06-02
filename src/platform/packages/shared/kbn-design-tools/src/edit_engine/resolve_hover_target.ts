/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ResizeHandle } from '../lib/constants';
import { findNearHandle } from './resize_helpers';
import { getElementUnder } from '../lib/dom/get_element_under';
import { hasSignificantRounding, isInRoundedDeadZone } from './rounded_dead_zone';

interface HoverResolution {
  /** The resolved hover target (may be the previous target if locked). */
  target: HTMLElement | null;
  /** Resize handle under the pointer, if any. */
  handle: ResizeHandle | null;
  /** True if the target has significant rounding (for dead-zone tracking). */
  isRounded: boolean;
}

/**
 * Resolve the hover target and optional resize handle for a given pointer
 * position. Encapsulates the three hover-detection strategies:
 *
 * 1. **Hover-lock zone**: when the pointer is in the controls zone below the
 *    current target, keep the target locked and only check for resize handles.
 * 2. **Rounded dead-zone**: when the pointer leaves a rounded element's hit-test
 *    shape but is still inside its bounding rect edge zone, keep the target to
 *    allow resize handle access.
 * 3. **Direct element lookup**: fall through to `getElementUnder` for normal
 *    hover detection.
 */
export const resolveHoverTarget = (
  x: number,
  y: number,
  currentTarget: HTMLElement | null,
  isInsideHoverLock: (px: number, py: number) => boolean,
  isCurrentTargetRounded: boolean
): HoverResolution => {
  // Strategy 1: hover-lock zone. Pointer is in the controls area below the element.
  const isInHoverLockZone = currentTarget && isInsideHoverLock(x, y);
  if (isInHoverLockZone) {
    const handle = findNearHandle(x, y, currentTarget.getBoundingClientRect());
    return { target: currentTarget, handle, isRounded: false };
  }

  // Check for resize handle on current target before switching
  if (currentTarget) {
    const handle = findNearHandle(x, y, currentTarget.getBoundingClientRect());
    if (handle) {
      return { target: currentTarget, handle, isRounded: false };
    }
  }

  const nextTarget = getElementUnder(x, y);

  // Strategy 2: rounded dead-zone. The pointer left the rounded hit-test shape
  // but is still in the bounding-rect edge zone. Keep the current target so
  // the user can reach resize handles in the dead zone corners.
  // Skip when the new target is a child. The cursor moved to a descendant,
  // not a dead zone.
  const targetChanged = currentTarget && nextTarget !== currentTarget;
  if (targetChanged) {
    const isChild = nextTarget && currentTarget.contains(nextTarget);

    if (
      !isChild &&
      isCurrentTargetRounded &&
      isInRoundedDeadZone(x, y, currentTarget.getBoundingClientRect())
    ) {
      const handle = findNearHandle(x, y, currentTarget.getBoundingClientRect());
      return { target: currentTarget, handle, isRounded: false };
    }

    // One more handle check before giving up the current target
    const handle = findNearHandle(x, y, currentTarget.getBoundingClientRect());
    if (handle) {
      return { target: currentTarget, handle, isRounded: false };
    }
  }

  // Strategy 3: direct element lookup
  const isRounded = nextTarget ? hasSignificantRounding(nextTarget) : false;
  return { target: nextTarget, handle: null, isRounded };
};
