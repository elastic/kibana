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

// ES rejects every routed request with this reason until it has applied the
// origin project state seeded into the operator `settings.json` (see the
// `state.project` block written by `getOperatorVolume` in `docker.ts`). The
// state is applied asynchronously by ES's `FileSettingsService`, so it can lag
// behind cluster-green + the security index.
const NO_PROJECT_STATE_SIGNATURE = 'No origin project state';

export interface WaitForProjectStateOptions {
  client: Client;
  log: ToolingLog;
  readyTimeout?: number;
}

const indicatesMissingProjectState = (error: any): boolean => {
  const candidates: string[] = [];
  if (error?.message) {
    candidates.push(String(error.message));
  }
  const esError = error?.meta?.body?.error;
  if (typeof esError === 'string') {
    candidates.push(esError);
  } else if (esError) {
    if (esError.reason) {
      candidates.push(String(esError.reason));
    }
    if (Array.isArray(esError.root_cause)) {
      for (const rootCause of esError.root_cause) {
        if (rootCause?.reason) {
          candidates.push(String(rootCause.reason));
        }
      }
    }
  }
  return candidates.some((message) => message.includes(NO_PROJECT_STATE_SIGNATURE));
};

/**
 * Waits until the serverless Cross-Project Search (CPS) origin project state has
 * been applied by Elasticsearch. Until then, ES rejects every search with
 * `illegal_state_exception: No origin project state for project default`, so a
 * CPS-enabled fixture must not report ready before a probe search stops hitting
 * that error — otherwise the suite runs against a cluster that fails every query.
 */
export async function waitForProjectState({
  client,
  log,
  readyTimeout = DEFAULT_READY_TIMEOUT,
}: WaitForProjectStateOptions) {
  let attempt = 0;
  const start = Date.now();

  log.info('waiting for ES cluster to apply the CPS origin project state');

  while (true) {
    attempt += 1;

    try {
      // A cluster-wide search forces ES to resolve the origin project before
      // touching indices, so it surfaces the missing-project-state error even
      // when no user indices exist yet. allow_no_indices / ignore_unavailable
      // ensure the only failure that can bubble up is the project-state one.
      await client.search({
        index: '*',
        allow_no_indices: true,
        ignore_unavailable: true,
        size: 0,
      });
      log.success('ES CPS origin project state is ready');
      return;
    } catch (error) {
      if (!indicatesMissingProjectState(error)) {
        // Any outcome other than the missing-project-state error means the state
        // has been applied (or does not gate this request), so we are ready.
        log.success('ES CPS origin project state is ready');
        return;
      }

      const timeSinceStart = Date.now() - start;
      if (timeSinceStart > readyTimeout) {
        const sec = readyTimeout / 1000;
        throw new Error(
          `ES cluster failed to apply the CPS origin project state within the ${sec} second timeout`
        );
      }

      log.warning(
        `waiting for ES cluster to apply the CPS origin project state, attempt ${attempt} failed with: ${error?.message}`
      );

      const waitSec = attempt * 1.5;
      await new Promise((resolve) => setTimeout(resolve, waitSec * 1000));
    }
  }
}
