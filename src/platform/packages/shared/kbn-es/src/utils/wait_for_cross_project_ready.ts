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
const ORIGIN_PROJECT_NOT_READY = 'No origin project state';

export interface WaitForCrossProjectReadyOptions {
  client: Client;
  log: ToolingLog;
  readyTimeout?: number;
}

const getErrorText = (error: any): string => {
  const esError = error?.meta?.body?.error;
  return (
    esError?.reason ?? esError?.root_cause?.[0]?.reason ?? error?.message ?? String(error) ?? ''
  );
};

/**
 * With Cross-Project Search (CPS) enabled, the cluster can report green and accept
 * writes before the origin project state is registered. Searches issued during that
 * window fail with `illegal_state_exception: No origin project state`. Poll a
 * lightweight search until the origin project state resolves so that `startES()`
 * is a true readiness signal for CPS callers.
 */
export async function waitForCrossProjectReady({
  client,
  log,
  readyTimeout = DEFAULT_READY_TIMEOUT,
}: WaitForCrossProjectReadyOptions) {
  let attempt = 0;
  const start = Date.now();

  // The loop will continue until timeout even if SIGINT is signaled, so force exit
  process.on('SIGINT', () => process.exit());

  log.info(`waiting for ES cluster to register the CPS origin project state`);

  while (true) {
    attempt += 1;

    try {
      await client.search({
        index: '*',
        allow_no_indices: true,
        ignore_unavailable: true,
        size: 0,
        query: { match_all: {} },
      });
      log.success('ES CPS origin project state is ready');
      return;
    } catch (error) {
      const errorText = getErrorText(error);

      // Only tolerate the origin-project-not-ready error; rethrow anything else immediately.
      if (!errorText.includes(ORIGIN_PROJECT_NOT_READY)) {
        throw error;
      }

      const timeSinceStart = Date.now() - start;
      if (timeSinceStart > readyTimeout) {
        const sec = readyTimeout / 1000;
        throw new Error(
          `ES cluster failed to register the CPS origin project state within the ${sec} second timeout`
        );
      }

      log.warning(
        `waiting for ES cluster to register the CPS origin project state, attempt ${attempt} failed with: ${errorText}`
      );

      const waitSec = attempt * 1.5;
      await new Promise((resolve) => setTimeout(resolve, waitSec * 1000));
    }
  }
}
