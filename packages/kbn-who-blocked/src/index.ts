/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import apm from 'elastic-apm-node';
import { createHook } from 'async_hooks';

const thresholdNs = 10 * 1e6; // 10 ms

interface CacheEntry {
  hrtime: [number, number];
  transaction: apm.Transaction | null;
  span: apm.Span | null;
}

export function initWhoBlocked() {
  const cache = new Map<number, CacheEntry>();

  function before(asyncId: number) {
    cache.set(asyncId, {
      hrtime: process.hrtime(),
      transaction: apm.currentTransaction,
      span: apm.currentSpan,
    });
  }

  function after(asyncId: number) {
    const cached = cache.get(asyncId);
    if (cached == null) {
      return;
    }
    cache.delete(asyncId);

    const diff = process.hrtime(cached.hrtime);
    const diffNs = diff[0] * 1e9 + diff[1];
    if (diffNs > thresholdNs) {
      const time = diffNs / 1e6;
      // eslint-disable-next-line no-console
      console.warn({
        label: 'EventLoopMonitor',
        message: `Event loop was blocked for ${time}ms`,
        metadata: {
          time,
          transaction: cached.transaction,
          span: cached.span,
        },
      });
    }
  }

  const asyncHook = createHook({ before, after });

  asyncHook.enable();
}
