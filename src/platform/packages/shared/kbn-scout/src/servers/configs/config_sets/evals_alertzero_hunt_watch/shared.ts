/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutServerConfig } from '../../../../types';
import { serviceAccountsServerArgs } from '../service_accounts/shared';

/**
 * Suite-specific server args shared by the stateful and serverless variants of
 * the `evals_alertzero_hunt_watch` config set. The suite drives the production
 * hunt Worker, so it needs what the Worker needs:
 *
 * - service accounts (the Worker runs as one; off by default, and the suite's
 *   setup calls `/internal/security/service_account`),
 * - alertzero plus its required `agenticInvestigations` and `proposals` plugins
 *   (both default off; without them Kibana cascade-disables alertzero and the
 *   hunt routes never register),
 * - the `securitySolution:enableAlertZero` setting (every `/internal/alertzero/*`
 *   route answers 404 while it is off, including the Worker list the suite's
 *   setup reads),
 * - the Workflows UI and agent settings the hunt workflows' `ai.agent` steps
 *   require.
 *
 * On serverless the project layout pins the plugin set, so the `--xpack.*`
 * enable flags are inert there, but the uiSettings overrides and the service
 * account args still apply.
 */
export const withAlertzeroHuntWatch = (base: ScoutServerConfig): ScoutServerConfig => ({
  ...base,
  kbnTestServer: {
    ...base.kbnTestServer,
    serverArgs: [
      ...base.kbnTestServer.serverArgs,
      ...serviceAccountsServerArgs,
      '--xpack.alertzero.enabled=true',
      '--xpack.agenticInvestigations.enabled=true',
      '--xpack.proposals.enabled=true',
      '--uiSettings.overrides.securitySolution:enableAlertZero=true',
      '--uiSettings.overrides.workflows:ui:enabled=true',
      '--uiSettings.overrides.workflows:aiAgent:enabled=true',
      '--uiSettings.overrides.agentBuilder:experimentalFeatures=true',
    ],
  },
});
