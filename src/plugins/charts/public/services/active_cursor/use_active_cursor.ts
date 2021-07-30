/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { intersection } from 'lodash';
import { useCallback, useEffect, RefObject } from 'react';
import { filter } from 'rxjs/operators';

import type { Chart } from '@elastic/charts';

import { parseSyncOptions } from './active_cursor_utils';

import type { ActiveCursor } from './active_cursor';
import type { ActiveCursorSyncOption } from './types';

export const useActiveCursor = (
  activeCursor: ActiveCursor,
  chartRef: RefObject<Chart>,
  syncOptions: ActiveCursorSyncOption
) => {
  const { accessors, isDateHistogram } = parseSyncOptions(syncOptions);
  const handleCursorUpdate = useCallback(
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
  }, [activeCursor.activeCursor$, chartRef, accessors, isDateHistogram]);

  return handleCursorUpdate;
};
