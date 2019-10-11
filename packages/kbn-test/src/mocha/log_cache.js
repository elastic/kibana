/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
