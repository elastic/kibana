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
 * Ensures that the default space NPRE exists and routes to all projects.
 *
 * This makes `project_routing: "@kibana_space_default_default"` behave as flat-world in local Scout CPS setups.
 *
 * In managed environments, writes to `/_project_routing/*` may be restricted; in that case we log and continue.
 */
export async function ensureDefaultSpaceNPRE(config: Config, log: ToolingLog): Promise<void> {
  const scoutConfig = config.getScoutTestConfig();
  const cpsEnabled = config.get('esServerlessOptions.cps', false);
  if (!scoutConfig.serverless || !cpsEnabled) {
    return;
  }

  const es = getEsClient(scoutConfig, new ScoutLogger('ensure-default-space-npre', 'info'));

  try {
    await es.transport.request({
      method: 'PUT',
      path: `/_project_routing/${DEFAULT_SPACE_NPRE}`,
      body: { expression: DEFAULT_EXPRESSION },
    });
    log.debug(`Ensured ${DEFAULT_SPACE_NPRE} => ${DEFAULT_EXPRESSION}`);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    log.warning(
      `Failed to ensure ${DEFAULT_SPACE_NPRE} routing expression (this can be restricted outside local Scout): ${message}`
    );
  }
}
