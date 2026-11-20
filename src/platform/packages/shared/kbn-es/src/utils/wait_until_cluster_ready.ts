/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Client } from '@elastic/elasticsearch';
import type { HealthStatus } from '@elastic/elasticsearch/lib/api/types';
import type { ToolingLog } from '@kbn/tooling-log';
const DEFAULT_READY_TIMEOUT = 120 * 1000; // 2 minutes

export type ClusterReadyStatus = 'green' | 'yellow';
export interface WaitOptions {
  client: Client;
  expectedStatus: ClusterReadyStatus;
  log: ToolingLog;
  readyTimeout?: number;
}

const checkStatus = (readyStatus: ClusterReadyStatus) => {
  return readyStatus === 'yellow'
    ? (status: HealthStatus) => status.toLocaleLowerCase() !== 'red'
    : (status: HealthStatus) => status.toLocaleLowerCase() === 'green';
};

/**
 * General method to wait for the ES cluster status to be yellow or green
 */
export async function waitUntilClusterReady({
  client,
  expectedStatus,
  log,
  readyTimeout = DEFAULT_READY_TIMEOUT,
}: WaitOptions) {
  const attempt = 0;
  const start = Date.now();

  // The loop would continue until timeout even if SIGINT is signaled, so force exit while it
  // runs. Only while it runs: left registered, it would cut short the graceful shutdown of
  // whoever started the cluster (process.exit skips their asynchronous exit hooks).
  const forceExitOnSigint = () => process.exit();
  process.on('SIGINT', forceExitOnSigint);

  try {
    await pollUntilReady({ client, expectedStatus, log, readyTimeout, start, attempt });
  } finally {
    process.off('SIGINT', forceExitOnSigint);
  }
}

async function pollUntilReady({
  client,
  expectedStatus,
  log,
  readyTimeout,
  start,
  attempt,
}: Required<WaitOptions> & { start: number; attempt: number }) {
  log.info(`waiting for ES cluster to report a ${expectedStatus} status`);

  const isReady = checkStatus(expectedStatus);

  while (true) {
    attempt += 1;

    try {
      const resp = await client.cluster.health();
      const status: HealthStatus = resp.status;
      if (isReady(status)) {
        log.success('ES cluster is ready');
        return;
      }

      throw new Error(`not ready, cluster health is ${status}`);
    } catch (error) {
      const timeSinceStart = Date.now() - start;
      if (timeSinceStart > readyTimeout) {
        const sec = readyTimeout / 1000;
        throw new Error(`ES cluster failed to come online with the ${sec} second timeout`);
      }

      if (error?.message?.startsWith('not ready,')) {
        if (timeSinceStart > 10_000) {
          log.warning(error.message);
        }
      } else {
        log.warning(
          `waiting for ES cluster to come online, attempt ${attempt} failed with: ${error?.message}`
        );
      }

      const waitSec = attempt * 1.5;
      await new Promise((resolve) => setTimeout(resolve, waitSec * 1000));
    }
  }
}
