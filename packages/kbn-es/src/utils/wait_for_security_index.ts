/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Client } from '@elastic/elasticsearch';
import { ToolingLog } from '@kbn/tooling-log';
const DEFAULT_READY_TIMEOUT = 10 * 1000; // 10 seconds

export interface WaitOptions {
  client: Client;
  log: ToolingLog;
  readyTimeout?: number;
}

/**
 * General method to wait for the ES cluster status to be yellow or green
 */
export async function waitForSecurityIndex({
  client,
  log,
  readyTimeout = DEFAULT_READY_TIMEOUT,
}: WaitOptions) {
  let attempt = 0;
  const start = Date.now();

  // The loop will continue until timeout even if SIGINT is signaled, so force exit
  process.on('SIGINT', () => process.exit());

  log.info(`waiting for ES cluster to bootstrap the security index`);

  // Hack to force the creation of the index `.security-7` index
  const response = await client.security.createApiKey({ name: 'test-api-key-to-delete' });
  while (true) {
    attempt += 1;

    try {
      await client.security.invalidateApiKey({ ids: [response.id] });
      log.success('ES security index is ready');
      return;
    } catch (error) {
      const timeSinceStart = Date.now() - start;
      if (timeSinceStart > readyTimeout) {
        const sec = readyTimeout / 1000;
        throw new Error(
          `ES cluster failed to bootstrap the security index with the ${sec} second timeout`
        );
      }

      log.warning(
        `waiting for ES cluster to bootstrap the security index, attempt ${attempt} failed with: ${error?.message}`
      );

      const waitSec = attempt * 1.5;
      await new Promise((resolve) => setTimeout(resolve, waitSec * 1000));
    }
  }
}
