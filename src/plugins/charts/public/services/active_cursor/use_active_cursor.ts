/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useCallback, useEffect, RefObject } from 'react';

import type { Chart } from '@elastic/charts';
import type { ActiveCursor } from './active_cursor';

export const useActiveCursor = (activeCursor: ActiveCursor, chartRef: RefObject<Chart>) => {
  const handleCursorUpdate = useCallback(
    (cursor) => {
      activeCursor.activeCursor$?.next(cursor);
    },
    [activeCursor.activeCursor$]
  );

  useEffect(() => {
    const cursorSubscription = activeCursor.activeCursor$?.subscribe((cursor) => {
      chartRef?.current?.dispatchExternalPointerEvent(cursor);
    });

    return () => {
      cursorSubscription?.unsubscribe();
    };
  }, [activeCursor.activeCursor$, chartRef]);

  return handleCursorUpdate;
};
