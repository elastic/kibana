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
const entryExports = require(workerData.__entry); // eslint-disable-line import/no-dynamic-require

function postReady() {
  // The effective limit, since a process-wide --max-old-space-size overrides resourceLimits.
  parentPort.postMessage({
    __kbnManagedWorker: 'ready',
    heapSizeLimit: getHeapStatistics().heap_size_limit,
  });
}

// Entries may export `ready()` when application startup is asynchronous. Module load alone is
// not readiness. Entries that export nothing still report ready immediately.
Promise.resolve()
  .then(() => {
    if (entryExports && typeof entryExports.ready === 'function') {
      return entryExports.ready();
    }
  })
  .then(postReady)
  .catch((error) => {
    const message = error instanceof Error ? error.stack || error.message : String(error);
    parentPort.postMessage({ __kbnManagedWorker: 'failed', message });
    // eslint-disable-next-line no-console
    console.error(message);
    process.exit(1);
  });

setInterval(() => {
  parentPort.postMessage({
    __kbnManagedWorker: 'health',
    heapUsed: getHeapStatistics().used_heap_size,
  });
}, workerData.__healthIntervalMs).unref();
