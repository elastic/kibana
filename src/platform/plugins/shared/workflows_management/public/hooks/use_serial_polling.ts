/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useRef } from 'react';

export interface UseSerialPollingParams {
  poll: () => Promise<unknown>;
  intervalMs: number | (() => number);
  enabled?: boolean;
  immediate?: boolean;
  pollKey?: string | number | boolean | null | undefined;
  shouldStop?: () => boolean;
}

const resolveIntervalMs = (intervalMs: number | (() => number)): number =>
  typeof intervalMs === 'function' ? intervalMs() : intervalMs;

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
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

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
          await pollRef.current().catch(() => undefined);

          if (cancelled || shouldStopRef.current()) {
            break;
          }
        }

        isFirstIteration = false;

        if (cancelled || shouldStopRef.current()) {
          break;
        }

        await new Promise((resolve) => {
          timeoutRef.current = setTimeout(resolve, resolveIntervalMs(intervalMsRef.current));
        });

        if (cancelled || shouldStopRef.current()) {
          break;
        }
      }
    };

    void run();

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      cancelled = true;
    };
  }, [enabled, immediate, pollKey]);
};
