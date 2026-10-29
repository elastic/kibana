/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { appendFileSync } from 'node:fs';
import v8 from 'node:v8';
import { isMainThread, threadId } from 'node:worker_threads';

/**
 * Writes one heap sample when `KBN_REMOTE_HEAP_LOG` is a file path.
 * Calls `global.gc()` first when Node was started with `--expose-gc`.
 */
export function recordRemoteHeap(label: string, outcome: string): void {
  const path = process.env.KBN_REMOTE_HEAP_LOG;
  if (!path) return;
  const gc = (global as { gc?: () => void }).gc;
  const gcAvailable = typeof gc === 'function';
  if (gcAvailable) {
    gc();
  }
  const heap = v8.getHeapStatistics();
  const spaces = v8.getHeapSpaceStatistics().map((space) => ({
    name: space.space_name,
    used: space.space_used_size,
    size: space.space_size,
    physical: space.physical_space_size,
  }));
  const line = JSON.stringify({
    label,
    phase: 'after-workflow-gc',
    outcome,
    gcAvailable,
    isMainThread,
    threadId,
    heap,
    spaces,
    memory: process.memoryUsage(),
    at: new Date().toISOString(),
  });
  appendFileSync(path, `${line}\n`);
}
