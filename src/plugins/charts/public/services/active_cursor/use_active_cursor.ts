/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { intersection } from 'lodash';
import { animationFrameScheduler } from 'rxjs';
import { useCallback, useEffect, RefObject } from 'react';
import { filter, debounceTime } from 'rxjs';

import type { Chart, PointerUpdateListener } from '@elastic/charts';

import { parseSyncOptions } from './active_cursor_utils';

import type { ActiveCursor } from './active_cursor';
import type { ActiveCursorSyncOption } from './types';

const DEFAULT_DEBOUNCE_TIME_MS = 8; // don't update more than once per frame but try to avoid skipping frames

export const useActiveCursor = (
  activeCursor: ActiveCursor,
  chartRef: RefObject<Chart>,
  syncOptions: ActiveCursorSyncOption
): PointerUpdateListener => {
  const { accessors, isDateHistogram } = parseSyncOptions(syncOptions);
  const handleCursorUpdate = useCallback<PointerUpdateListener>(
    (cursor) => {
      activeCursor.activeCursor$?.next({
        cursor,
        isDateHistogram,
        accessors,
      });
    },
    [activeCursor.activeCursor$, accessors, isDateHistogram]
  );

  useEffect(() => {
    const cursorSubscription = activeCursor.activeCursor$
      ?.pipe(
        debounceTime(syncOptions.debounce ?? DEFAULT_DEBOUNCE_TIME_MS, animationFrameScheduler),
        filter((payload) => {
          if (payload.isDateHistogram && isDateHistogram) {
            return true;
          }
          return intersection(accessors, payload.accessors).length > 0;
        })
      )
      .subscribe(({ cursor }) => {
        chartRef?.current?.dispatchExternalPointerEvent(cursor);
      });

    return () => {
      cursorSubscription?.unsubscribe();
    };
  }, [activeCursor.activeCursor$, syncOptions.debounce, chartRef, accessors, isDateHistogram]);

  return handleCursorUpdate;
};
