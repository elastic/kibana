/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Client } from '@elastic/elasticsearch';
import { ToolingLog } from '@kbn/tooling-log';
const DEFAULT_READY_TIMEOUT = 60 * 1000; // 1 minute

export interface WaitOptions {
  client: Client;
  log: ToolingLog;
  readyTimeout?: number;
}

/**
 * General method to wait for the ES cluster status to be yellow or green
 */
export async function waitForClusterReady({
  client,
  log,
  readyTimeout = DEFAULT_READY_TIMEOUT,
}: WaitOptions) {
  let attempt = 0;
  const start = Date.now();

  log.info('waiting for ES cluster to report a yellow or green status');

  while (true) {
    attempt += 1;

    try {
      const resp = await client.cluster.health();
      if (resp.status !== 'red') {
        return;
      }

      throw new Error(`not ready, cluster health is ${resp.status}`);
    } catch (error) {
      const timeSinceStart = Date.now() - start;
      if (timeSinceStart > readyTimeout) {
        const sec = readyTimeout / 1000;
        throw new Error(`ES cluster failed to come online with the ${sec} second timeout`);
      }

      if (error.message.startsWith('not ready,')) {
        if (timeSinceStart > 10_000) {
          log.warning(error.message);
        }
      } else {
        log.warning(
          `waiting for ES cluster to come online, attempt ${attempt} failed with: ${error.message}`
        );
      }

      const waitSec = attempt * 1.5;
      await new Promise((resolve) => setTimeout(resolve, waitSec * 1000));
    }
  }
}
