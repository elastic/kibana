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
import { serviceAccountsServerArgs } from '../../service_accounts/shared';

/**
 * Config set for the hunt-watch eval suite. The suite drives the managed Hunt Watch Worker
 * (`system-security-hunt-continuous-threat-hunt`), so AlertZero, Agentic Investigations, and the
 * Workflows UI/agent settings must all be enabled. `xpack.alertzero.enabled` defaults to `false`
 * so it is set explicitly below.
 *
 * `agenticInvestigations` and `proposals` are both **required** plugins of alertzero and both
 * default to `enabled: false`. Without either flag Kibana cascade-disables alertzero entirely, so
 * the managed hunt workflows are never installed. `inbox` is required for the HITL approval spec
 * to respond to the proposal gate.
 *
 * `serviceAccountsServerArgs` (`xpack.security.serviceAccounts.enabled=true`) is required because
 * every `/internal/alertzero/*` route (the Worker list/enable route this suite's preflight calls)
 * is gated on `hasRequiredDependencies`, which includes `this.serviceAccountsEnabled` in
 * `alertzero/server/plugin.ts`. That is false by default, so every AlertZero route 503s
 * ("AlertZero dependencies are unavailable") without this flag. Detection Watch's config set
 * omits it because that suite never calls an `/internal/alertzero/*` route directly.
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
      '--xpack.inbox.enabled=true',
      '--uiSettings.overrides.workflows:ui:enabled=true',
      '--uiSettings.overrides.workflows:aiAgent:enabled=true',
      ...serviceAccountsServerArgs,
    ],
  },
};
