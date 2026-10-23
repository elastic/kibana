/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Plain JS: this file runs before any transpiler is installed in the worker.
// Control messages use the `__kbnManagedWorker` key read by managed_worker.ts.

// Hardening and the swc require hook are per isolate, so the worker loads them itself, before
// anything else. `build.distributable` is the same source Core uses to detect a distributable.
if (require('@kbn/repo-info').isKibanaDistributable()) {
  require('@kbn/setup-node-env/dist');
} else {
  require('@kbn/setup-node-env');
}

const { parentPort, workerData } = require('node:worker_threads');
const { getHeapStatistics } = require('node:v8');

// The entry is the consumer's worker file, so its path is only known at runtime.
require(workerData.__entry); // eslint-disable-line import/no-dynamic-require

parentPort.postMessage({ __kbnManagedWorker: 'ready' });

setInterval(() => {
  parentPort.postMessage({
    __kbnManagedWorker: 'health',
    heapUsed: getHeapStatistics().used_heap_size,
  });
}, workerData.__healthIntervalMs).unref();
