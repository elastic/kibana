/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { writeSync } from 'node:fs';
import { workerData } from 'node:worker_threads';
import type { WatchdogWorkerData } from '@kbn/core-metrics-server-internal/src/event_loop_watchdog/types';
import {
  POLL_INTERVAL_MS,
  Slot,
} from '@kbn/core-metrics-server-internal/src/event_loop_watchdog/constants';

// Emits a log line with the first profiling state it reads, then whenever that state changes.
const { shared } = (workerData as { data: WatchdogWorkerData }).data;
const slots = new BigInt64Array(shared);
let last: bigint | undefined;
setInterval(() => {
  const profiling = Atomics.load(slots, Slot.profiling);
  if (profiling !== last) {
    last = profiling;
    writeSync(1, `${JSON.stringify({ message: `profiling ${profiling}` })}\n`);
  }
}, POLL_INTERVAL_MS);
