/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useRef, useState } from 'react';

import { msToSeconds } from '../utils';

/**
 * Manages an auto-refresh interval timer.
 *
 * @param isPaused - Whether the auto-refresh timer is paused.
 * @param intervalMs - The interval in milliseconds.
 * @param onRefresh - The callback to fire when the auto-refresh interval is reached.
 * @param refreshEpoch - Increment this value to reset the countdown immediately (e.g. when an
 *   external timer fires a refresh). `undefined` on initial render is ignored.
 *
 * When `isPaused` is false and `intervalMs > 0`, fires `onRefresh` repeatedly
 * at the given interval and tracks the seconds remaining until the next refresh.
 *
 * Pausing freezes the countdown; resuming continues from where it left off.
 * The countdown resets when `intervalMs` changes or when `refreshEpoch` increments.
 * `onRefresh` is kept in a ref so changing it never restarts the timer.
 *
 * @returns The seconds remaining until the next refresh, or `null` when the interval is invalid.
 */
export function useAutoRefresh({
  isPaused,
  intervalMs,
  onRefresh,
  refreshEpoch,
}: {
  isPaused: boolean;
  intervalMs: number;
  onRefresh: (() => void) | undefined;
  refreshEpoch?: number;
}): { secondsRemaining: number | null } {
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);

  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  const secondsRemainingRef = useRef<number | null>(null);
  secondsRemainingRef.current = secondsRemaining;

  // Reset countdown when the interval changes
  useEffect(() => {
    const total = msToSeconds(intervalMs);
    const value = total > 0 ? total : null;

    secondsRemainingRef.current = value;
    setSecondsRemaining(value);
  }, [intervalMs]);

  // Run the countdown; pause without resetting, resume from current position.
  // Resets to the full interval when `refreshEpoch` increments (external refresh signal).
  useEffect(() => {
    const total = msToSeconds(intervalMs);

    if (isPaused || total <= 0) return;

    let remaining = secondsRemainingRef.current ?? total;
    if (remaining <= 0) remaining = total;

    // External refresh: reset to the full interval so the countdown stays in sync
    // with the actual query cadence driven by the Kibana timefilter.
    if (refreshEpoch != null) {
      remaining = total;
      secondsRemainingRef.current = total;
      setSecondsRemaining(total);
    }

    const tick = setInterval(() => {
      remaining -= 1;

      if (remaining === 0) {
        onRefreshRef.current?.();
        remaining = total;
      }

      setSecondsRemaining(remaining);
    }, 1000);

    return () => clearInterval(tick);
  }, [isPaused, intervalMs, refreshEpoch]);

  return { secondsRemaining };
}
