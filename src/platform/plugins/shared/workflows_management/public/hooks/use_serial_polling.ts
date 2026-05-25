/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useRef } from 'react';
import { sleep } from './polling_utils';

export interface UseSerialPollingParams {
  poll: () => Promise<unknown>;
  intervalMs: number | (() => number);
  enabled?: boolean;
  /** When false, waits one interval before the first poll (use when an initial fetch already ran). */
  immediate?: boolean;
  /**
   * Restarts the polling loop when this value changes (e.g. a new execution id).
   * Required when shouldStop can end the loop and the polled resource identity changes.
   */
  pollKey?: string | number | boolean | null | undefined;
  shouldStop?: () => boolean;
}

const resolveIntervalMs = (intervalMs: number | (() => number)): number =>
  typeof intervalMs === 'function' ? intervalMs() : intervalMs;

/**
 * Polls serially: await poll(), then sleep(interval), then repeat.
 * At most one in-flight poll at a time; the next request starts only after the previous finishes.
 */
export const useSerialPolling = ({
  poll,
  intervalMs,
  enabled = true,
  immediate = true,
  pollKey,
  shouldStop = () => false,
}: UseSerialPollingParams): void => {
  const pollRef = useRef(poll);
  const intervalMsRef = useRef(intervalMs);
  const shouldStopRef = useRef(shouldStop);

  pollRef.current = poll;
  intervalMsRef.current = intervalMs;
  shouldStopRef.current = shouldStop;

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let cancelled = false;

    const run = async () => {
      let isFirstIteration = true;

      while (!cancelled) {
        if (immediate || !isFirstIteration) {
          try {
            await pollRef.current();
          } catch {
            // Continue polling after interval on failure.
          }

          if (cancelled || shouldStopRef.current()) {
            break;
          }
        }

        isFirstIteration = false;

        await sleep(resolveIntervalMs(intervalMsRef.current));

        if (cancelled || shouldStopRef.current()) {
          break;
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [enabled, immediate, pollKey]);
};
