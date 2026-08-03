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

const DEFAULT_READY_TIMEOUT = 60 * 1000; // 60 seconds

export interface WaitForCpsProjectStateOptions {
  client: Client;
  log: ToolingLog;
  readyTimeout?: number;
}

/**
 * When Cross-Project Search (CPS) is enabled, the serverless cluster can report healthy
 * before Elasticsearch has provisioned the origin project state. Until it has, every
 * search-path request fails immediately with
 * `illegal_state_exception: No origin project state for project <id>`.
 *
 * Poll a search (which resolves the origin project state without depending on any data)
 * until it succeeds, so the fixture only reports ready once project routing can actually
 * be resolved.
 */
export async function waitForCpsProjectState({
  client,
  log,
  readyTimeout = DEFAULT_READY_TIMEOUT,
}: WaitForCpsProjectStateOptions) {
  let attempt = 0;
  const start = Date.now();

  // The loop will continue until timeout even if SIGINT is signaled, so force exit
  process.on('SIGINT', () => process.exit());

  log.info(`waiting for ES cluster to provision the CPS origin project state`);

  while (true) {
    attempt += 1;

    try {
      await client.search({ index: '*', allow_no_indices: true, size: 0 });
      log.success('CPS origin project state is ready');
      return;
    } catch (error) {
      const timeSinceStart = Date.now() - start;
      if (timeSinceStart > readyTimeout) {
        const sec = readyTimeout / 1000;
        throw new Error(
          `ES cluster failed to provision the CPS origin project state within the ${sec} second timeout`
        );
      }

      log.warning(
        `waiting for CPS origin project state, attempt ${attempt} failed with: ${error?.message}`
      );

      const waitSec = attempt * 1.5;
      await new Promise((resolve) => setTimeout(resolve, waitSec * 1000));
    }
  }
}
