/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ToolingLog } from '@kbn/tooling-log';
import { ScoutLogger } from '../common';
import { getEsClient } from '../common/services/clients';
import type { Config } from './configs';

const DEFAULT_SPACE_NPRE = 'kibana_space_default_default';
const DEFAULT_EXPRESSION = '_alias:*';

/**
 * Creates the default space NPRE (Named Project Routing Expression) for local Scout CPS setups.
 *
 * In real serverless, the control plane provisions NPREs during project setup. Locally there is
 * no control plane, so we manually `PUT /_project_routing/kibana_space_default_default` with
 * `_alias:*` to route across all projects. No-ops for non-CPS configurations.
 *
 * Throws on failure to prevent tests from running against a misconfigured environment.
 */
export async function ensureDefaultSpaceNPRE(config: Config, log: ToolingLog): Promise<void> {
  const scoutConfig = config.getScoutTestConfig();
  const cpsEnabled = config.get('esServerlessOptions.cps', false);
  if (!scoutConfig.serverless || !cpsEnabled) {
    return;
  }

  const es = getEsClient(scoutConfig, new ScoutLogger('ensure-default-space-npre', 'info'));

  // Registering the linked cluster can cause a brief disruption on the origin — retry a few times.
  const MAX_ATTEMPTS = 5;
  const RETRY_DELAY_MS = 2000;
  let lastError: Error | undefined;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      await es.transport.request({
        method: 'PUT',
        path: `/_project_routing/${DEFAULT_SPACE_NPRE}`,
        body: { expression: DEFAULT_EXPRESSION },
      });
      log.debug(`Ensured ${DEFAULT_SPACE_NPRE} => ${DEFAULT_EXPRESSION}`);
      return;
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      lastError = new Error(
        `Failed to ensure default space NPRE routing — CPS environment may not be properly configured: ${message}`
      );
      if (attempt < MAX_ATTEMPTS) {
        log.debug(
          `[ensureDefaultSpaceNPRE] attempt ${attempt} failed (${message}), retrying in ${RETRY_DELAY_MS}ms`
        );
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      }
    }
  }
  throw lastError;
}
