/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

const cachedSuiteLogs = new WeakMap();
const cachesRunnableLogs = new WeakMap();

/**
 * Add a chunk of log output to the cached
 * output for a suite
 * @param {Mocha.Suite} suite
 * @param {string} chunk
 */
export function recordLog(suite, chunk) {
  const cache = cachedSuiteLogs.get(suite) || '';
  cachedSuiteLogs.set(suite, cache + chunk);
}

/**
 * Recursively walk up from a runnable to collect
 * the cached log for its suite and all its parents
 * @param {Mocha.Suite} suite
 */
function getCurrentCachedSuiteLogs(suite) {
  const history = suite.parent ? getCurrentCachedSuiteLogs(suite.parent) : '';
  const ownLogs = cachedSuiteLogs.get(suite) || '';
  return history + ownLogs;
}

/**
 * Snapshot the logs from this runnable's suite at this point,
 * as the suite logs will get updated to include output from
 * subsequent runnables
 * @param {Mocha.Runnable} runnable
 */
export function snapshotLogsForRunnable(runnable) {
  cachesRunnableLogs.set(runnable, getCurrentCachedSuiteLogs(runnable.parent));
}

/**
 * Get the suite logs as they were when the logs for this runnable
 * were snapshotted
 * @param {Mocha.Runnable} runnable
 */
export function getSnapshotOfRunnableLogs(runnable) {
  return cachesRunnableLogs.get(runnable);
}
