/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useState } from 'react';

/** How long a width stays still before the map follows it. */
export const WIDTH_SETTLE_MS = 250;

/**
 * A measured width, once it stops changing. The first measure goes through at once, as the map
 * waits for it to load, and a resize is followed after it stops, not on every pixel of a drag.
 * A width of 0 after that (a hidden tab, a collapsed panel) is not a resize: the last width is
 * kept, so showing the map again does not load it again.
 */
export function useSettledWidth(width: number, delayMs = WIDTH_SETTLE_MS) {
  const [settled, setSettled] = useState(width);
  useEffect(() => {
    if (width === settled || (width === 0 && settled !== 0)) return;
    if (settled === 0) {
      setSettled(width);
      return;
    }
    const timer = setTimeout(() => setSettled(width), delayMs);
    return () => clearTimeout(timer);
  }, [width, settled, delayMs]);
  return settled;
}
