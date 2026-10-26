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

/**
 * Scout server config for tests that need `alertzero` and the plugins it depends on.
 *
 * `alertzero` gates threat-intel supply. `agenticInvestigations` and `proposals` are required
 * by alertzero and default off; without them Kibana cascade-disables alertzero and the TI
 * routes never register. The API tests of all three live under `test/scout_alertzero`
 * (security_solution, agentic_investigations, proposals).
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
      // Already the traditional default; pinned so a local override cannot refuse the service
      // account the Hunt Watch specs create.
      '--xpack.security.serviceAccounts.enabled=true',
      // Stateful Scout defaults restrictInternalApis=false. Pin true so authz specs can assert
      // that hunt/TI internal routes reject requests that omit x-elastic-internal-origin.
      // Applies to every suite on this config set, including agentic_investigations.
      '--server.restrictInternalApis=true',
    ],
  },
};
