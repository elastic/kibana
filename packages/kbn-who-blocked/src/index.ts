/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createHook } from 'async_hooks';

const thresholdNs = 150 * 1000000; // 150 ms

export function initWhoBlocked() {
  const cache = new Map<number, [number, number]>();

  function before(asyncId: number) {
    cache.set(asyncId, process.hrtime());
  }

  function after(asyncId: number) {
    const cached = cache.get(asyncId);
    if (cached == null) {
      return;
    }
    cache.delete(asyncId);

    const diff = process.hrtime(cached);
    const diffNs = diff[0] * 1e9 + diff[1];
    if (diffNs > thresholdNs) {
      const time = diffNs / 1e6;
      // eslint-disable-next-line no-console
      console.warn({
        label: 'EventLoopMonitor',
        message: `Event loop was blocked for ${time}ms`,
        metadata: {
          time,
        },
      });
    }
  }

  const asyncHook = createHook({ before, after });

  asyncHook.enable();
}
