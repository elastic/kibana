/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutServerConfig } from '../../../../../types';
import { defaultConfig } from '../../default/stateful/base.config';
import { serviceAccountsServerArgs } from '../../service_accounts/shared';

/**
 * Scout server config for tests that need `alertzero` and the plugins it depends on.
 *
 * `alertzero` gates threat-intel supply. `agenticInvestigations` and `proposals` are required
 * by alertzero and default off; without them Kibana cascade-disables alertzero and the TI
 * routes never register. The API tests of all three live under `test/scout_alertzero`
 * (security_solution, agentic_investigations, proposals).
 *
 * Since #295215 alertzero installs no managed workflows unless service accounts are enabled.
 *
 * Usage:
 *   node scripts/scout.js start-server --arch stateful --domain classic --serverConfigSet alertzero
 */
export const servers: ScoutServerConfig = {
  ...defaultConfig,
  kbnTestServer: {
    ...defaultConfig.kbnTestServer,
    serverArgs: [
      ...defaultConfig.kbnTestServer.serverArgs,
      '--xpack.alertzero.enabled=true',
      '--xpack.agenticInvestigations.enabled=true',
      '--xpack.proposals.enabled=true',
      ...serviceAccountsServerArgs,
    ],
  },
};
