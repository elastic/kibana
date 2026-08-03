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

const DEFAULT_READY_TIMEOUT = 30 * 1000; // 30 seconds

export interface WaitForCPSProjectStateOptions {
  client: Client;
  log: ToolingLog;
  readyTimeout?: number;
}

/**
 * Waits until Cross-Project Search (CPS) origin project state has been applied.
 *
 * The origin project state is bind-mounted into the container via operator
 * `settings.json` and applied asynchronously by ES's FileSettingsService, so a
 * CPS cluster can report green + have a security index before that state is in
 * place. Until it is, routed reads (search/msearch/count) fail with
 * `illegal_state_exception: No origin project state`. Poll a lightweight search
 * until it stops returning that error, giving a genuine CPS-readiness signal.
 */
export async function waitForCPSProjectState({
  client,
  log,
  readyTimeout = DEFAULT_READY_TIMEOUT,
}: WaitForCPSProjectStateOptions) {
  let attempt = 0;
  const start = Date.now();

  // The loop will continue until timeout even if SIGINT is signaled, so force exit
  process.on('SIGINT', () => process.exit());

  log.info('waiting for ES cluster to apply CPS origin project state');

  while (true) {
    attempt += 1;

    try {
      // Any routed read requires the origin project state; a no-data search against a
      // non-existent index pattern triggers the check without depending on indexed docs.
      await client.search({
        index: 'cps-readiness-probe-*',
        allow_no_indices: true,
        ignore_unavailable: true,
        size: 0,
      });
      log.success('ES CPS origin project state is ready');
      return;
    } catch (error) {
      const timeSinceStart = Date.now() - start;
      if (timeSinceStart > readyTimeout) {
        const sec = readyTimeout / 1000;
        throw new Error(
          `ES cluster failed to apply CPS origin project state within the ${sec} second timeout`
        );
      }

      log.warning(
        `waiting for ES cluster to apply CPS origin project state, attempt ${attempt} failed with: ${error?.message}`
      );

      const waitSec = attempt * 1.5;
      await new Promise((resolve) => setTimeout(resolve, waitSec * 1000));
    }
  }
}
