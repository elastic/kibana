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

export interface WaitForCpsReadyOptions {
  client: Client;
  log: ToolingLog;
  readyTimeout?: number;
}

/**
 * Waits until a Cross-Project Search (CPS) serverless cluster has committed its "origin"
 * project routing state.
 *
 * With `serverless.cross_project.enabled=true`, the cluster can report `green` (and have a
 * ready security index) before the origin project state lands in cluster state. Any request
 * carrying `project_routing` issued during that window fails with
 * `illegal_state_exception: No origin project state for project default`. Polling an
 * origin-routed search until it stops throwing closes that startup-ordering race, so tests
 * don't run their routed queries before the state is committed.
 */
export async function waitForCpsReady({
  client,
  log,
  readyTimeout = DEFAULT_READY_TIMEOUT,
}: WaitForCpsReadyOptions) {
  let attempt = 0;
  const start = Date.now();

  // The loop will continue until timeout even if SIGINT is signaled, so force exit
  process.on('SIGINT', () => process.exit());

  log.info(`waiting for ES cluster to commit the CPS origin project state`);

  while (true) {
    attempt += 1;

    try {
      await client.transport.request({
        method: 'POST',
        path: '/_search',
        querystring: { project_routing: '_alias:_origin' },
        body: { size: 0, track_total_hits: false },
      });
      log.success('ES CPS origin project state is ready');
      return;
    } catch (error) {
      const timeSinceStart = Date.now() - start;
      if (timeSinceStart > readyTimeout) {
        const sec = readyTimeout / 1000;
        throw new Error(
          `ES cluster failed to commit the CPS origin project state within the ${sec} second timeout (last error: ${error?.message})`
        );
      }

      log.warning(
        `waiting for ES cluster to commit the CPS origin project state, attempt ${attempt} failed with: ${error?.message}`
      );

      const waitSec = attempt * 1.5;
      await new Promise((resolve) => setTimeout(resolve, waitSec * 1000));
    }
  }
}
