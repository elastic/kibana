/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ToolingLog } from '@kbn/tooling-log';
import { createSamlSessionManager, ScoutLogger } from '../common';
import type { Config } from './configs';

/**
 * Pre-creates Elasticsearch Security indexes (.security-tokens, .security-profile)
 * by performing SAML authentication. This prevents race conditions when parallel tests
 * perform their first SAML authentication, as the security indexes will already exist.
 *
 * @param config - The server configuration containing Scout test config
 * @param log - Logger instance for logging operations
 */
export async function preCreateSecurityIndexesViaSamlAuth(
  config: Config,
  log: ToolingLog
): Promise<void> {
  const session = createSamlSessionManager(
    config.getScoutTestConfig(),
    new ScoutLogger('pre-create-security-indexes', 'info')
  );
  await session.getInteractiveUserSessionCookieWithRoleScope('admin');
  log.debug('Successfully pre-created Elasticsearch Security indexes');
}
