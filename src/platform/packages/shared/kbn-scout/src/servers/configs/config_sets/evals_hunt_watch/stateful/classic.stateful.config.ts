/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutServerConfig } from '../../../../../types';
import { servers as evalsTracingConfig } from '../../evals_tracing/stateful/classic.stateful.config';

/**
 * Config set for the hunt-watch eval suite. The suite drives the managed Hunt Watch Worker
 * (`system-security-hunt-continuous-threat-hunt`), which needs four things that are off by
 * default.
 *
 * `xpack.alertzero.enabled` defaults to `false`. `agenticInvestigations` and `proposals` are
 * optional dependencies of alertzero that also default to `false`, and
 * `xpack.security.serviceAccounts.enabled` defaults to `false`. AlertZero checks all three at
 * setup and start (`alertzero/server/plugin.ts`): without any one of them the Worker services are
 * never created, the managed hunt workflows are never installed, and every `/internal/alertzero/*`
 * route (the Worker list/enable route this suite's preflight calls) answers 503 "AlertZero
 * dependencies are unavailable".
 *
 * Only the service accounts flag is set here, not `serviceAccountsServerArgs`: that helper also
 * loads the security API integration test plugin, which this suite never calls.
 *
 * Nothing else is needed. `workflows:ui:enabled` already defaults to `true`, and `inbox` is only
 * an optional UI provider for workflows_management; the Proposal approve and dismiss routes the
 * approval spec calls live in the proposals plugin.
 *
 * Per-space `securitySolution:enableAlertZero` is set by this suite's preflight fixture, not by
 * server config, because it must be set per eval space (default, hunt-a, hunt-b, hunt-blocked)
 * rather than globally.
 */
export const servers: ScoutServerConfig = {
  ...evalsTracingConfig,
  kbnTestServer: {
    ...evalsTracingConfig.kbnTestServer,
    serverArgs: [
      ...evalsTracingConfig.kbnTestServer.serverArgs,
      '--xpack.alertzero.enabled=true',
      '--xpack.agenticInvestigations.enabled=true',
      '--xpack.proposals.enabled=true',
      '--xpack.security.serviceAccounts.enabled=true',
    ],
  },
};
