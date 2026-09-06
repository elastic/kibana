/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';

const DEFAULT_READY_TIMEOUT = 60 * 1000; // 1 minute

export interface WaitOptions {
  client: Client;
  log: ToolingLog;
  readyTimeout?: number;
}

/**
 * When Cross-Project Search (CPS) is enabled, Elasticsearch loads the origin
 * project state asynchronously after the cluster reports "ready". Until it lands,
 * every query fails with `illegal_state_exception: No origin project state`, so we
 * poll a trivial search here to gate the suite on that state being registered.
 */
export async function waitForCpsProjectState({
  client,
  log,
  readyTimeout = DEFAULT_READY_TIMEOUT,
}: WaitOptions) {
  let attempt = 0;
  const start = Date.now();

  // The loop will continue until timeout even if SIGINT is signaled, so force exit
  process.on('SIGINT', () => process.exit());

  log.info('waiting for ES to register the origin project CPS state');

  while (true) {
    attempt += 1;

    try {
      await client.search({ query: { match_all: {} } });
      log.success('ES origin project CPS state is ready');
      return;
    } catch (error) {
      const timeSinceStart = Date.now() - start;
      if (timeSinceStart > readyTimeout) {
        const sec = readyTimeout / 1000;
        throw new Error(
          `ES cluster failed to register the origin project CPS state within the ${sec} second timeout`
        );
      }

      log.warning(
        `waiting for ES to register the origin project CPS state, attempt ${attempt} failed with: ${error?.message}`
      );

      const waitSec = attempt * 1.5;
      await new Promise((resolve) => setTimeout(resolve, waitSec * 1000));
    }
  }
}
