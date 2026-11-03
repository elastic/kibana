/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'node:path';
import { workerData } from 'node:worker_threads';
import { REPO_ROOT } from '@kbn/repo-info';

// The real watchdog worker, crashing shortly after it detects a block: before the block's 1 s
// ongoing report, so the main thread is the only one that can report the block. A replacement
// worker started after the block doesn't detect one, so it doesn't crash.
const CRASH_AFTER_DETECTION_MS = 300;

// `Slot.blockStartedAt` in the watchdog's constants.ts. If it moves, this worker never crashes
// and the crash test fails.
const BLOCK_STARTED_AT_SLOT = 2;

// The worker module isn't exported by its package: it is only ever loaded as a worker entry.
require(Path.resolve(
  REPO_ROOT,
  'src/core/packages/metrics/server-internal/src/event_loop_watchdog/worker'
));

const shared = new BigInt64Array(workerData.data.shared);
const watch = setInterval(() => {
  if (Atomics.load(shared, BLOCK_STARTED_AT_SLOT) === 0n) {
    return;
  }
  clearInterval(watch);
  setTimeout(() => {
    throw new Error('crashing_entry: worker crashes on purpose');
  }, CRASH_AFTER_DETECTION_MS);
}, 25);
