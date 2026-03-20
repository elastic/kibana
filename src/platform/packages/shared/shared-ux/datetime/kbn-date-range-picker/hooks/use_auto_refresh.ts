/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useRef, useState } from 'react';

import { autoRefreshTotalSecondsFromMs } from '../utils';

/**
 * Manages an auto-refresh interval timer.
 *
 * @param isPaused - Whether the auto-refresh timer is paused.
 * @param intervalMs - The interval in milliseconds.
 * @param onRefresh - The callback to fire when the auto-refresh interval is reached.
 *
 * When `isPaused` is false and `intervalMs > 0`, fires `onRefresh` repeatedly
 * at the given interval and tracks the seconds remaining until the next refresh.
 *
 * The timer restarts whenever `isPaused` or `intervalMs` changes.
 * `onRefresh` is kept in a ref so changing it never restarts the timer.
 *
 * @returns The seconds remaining until the next refresh.
 */
export function useAutoRefresh({
  isPaused,
  intervalMs,
  onRefresh,
}: {
  isPaused: boolean;
  intervalMs: number;
  onRefresh: (() => void) | undefined;
}): { secondsRemaining: number | null } {
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);

  const onRefreshRef = useRef(onRefresh);

  onRefreshRef.current = onRefresh;

  useEffect(() => {
    const totalSeconds = autoRefreshTotalSecondsFromMs(intervalMs);

    if (isPaused || totalSeconds <= 0) {
      setSecondsRemaining(null);
      return;
    }

    let remaining = totalSeconds;

    setSecondsRemaining(remaining);

    const tick = setInterval(() => {
      remaining -= 1;

      if (remaining === 0) {
        onRefreshRef.current?.();
        remaining = totalSeconds;
      }

      setSecondsRemaining(remaining);
    }, 1000);

    return () => clearInterval(tick);
  }, [isPaused, intervalMs]);

  return { secondsRemaining };
}
