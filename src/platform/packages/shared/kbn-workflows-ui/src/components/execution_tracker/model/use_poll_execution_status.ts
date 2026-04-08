/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useRef } from 'react';
import { useWorkflowsApi } from '../../../api';
import type { PollExecutionStatusEntry } from '../types';

const RETRY_DELAY_MS = 5_000;

/**
 * Long-polls the `_poll_status` endpoint for a set of active execution IDs.
 * The server blocks for up to 30 s and returns immediately when any execution
 * changes state, so the client simply re-fetches after each response.
 */
export const usePollExecutionStatus = (
  activeIds: string[],
  onStatusUpdate: (statuses: Record<string, PollExecutionStatusEntry>) => void
): void => {
  const api = useWorkflowsApi();
  const onStatusUpdateRef = useRef(onStatusUpdate);
  onStatusUpdateRef.current = onStatusUpdate;

  const idsKey = activeIds.join(',');

  useEffect(() => {
    if (activeIds.length === 0) {
      return;
    }

    const controller = new AbortController();
    let cancelled = false;

    const poll = async () => {
      while (!cancelled) {
        try {
          const { statuses } = await api.pollExecutionStatus(activeIds, controller.signal);
          if (!cancelled) {
            onStatusUpdateRef.current(statuses);
          }
        } catch (err) {
          if (err.name === 'AbortError' || cancelled) {
            return;
          }
          // Wait before retrying on transient errors
          await new Promise<void>((resolve) => {
            const timer = setTimeout(resolve, RETRY_DELAY_MS);
            // Clean up timer if we get cancelled during the wait
            controller.signal.addEventListener(
              'abort',
              () => {
                clearTimeout(timer);
                resolve();
              },
              { once: true }
            );
          });
        }
      }
    };

    poll();

    return () => {
      cancelled = true;
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey, api]);
};
