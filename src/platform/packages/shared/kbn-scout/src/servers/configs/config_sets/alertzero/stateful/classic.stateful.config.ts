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
 * Config set for the AlertZero API suites (`alertzero/test/scout_alertzero/`).
 *
 * `xpack.alertzero.enabled` defaults to false, so the plugin — and every route it
 * registers — is absent on the default set. `agenticInvestigations` is a *required*
 * plugin of alertzero, and it also defaults to false: without it Kibana
 * cascade-disables alertzero entirely, so `initialize_managed_workflows.ts` never
 * runs and the action catalog the suite reads is never installed. Both flags are
 * load-bearing; neither can be toggled at runtime.
 */
export const servers: ScoutServerConfig = {
  ...defaultConfig,
  kbnTestServer: {
    ...defaultConfig.kbnTestServer,
    serverArgs: [
      ...defaultConfig.kbnTestServer.serverArgs,
      '--xpack.alertzero.enabled=true',
      '--xpack.agenticInvestigations.enabled=true',
    ],
  },
};
