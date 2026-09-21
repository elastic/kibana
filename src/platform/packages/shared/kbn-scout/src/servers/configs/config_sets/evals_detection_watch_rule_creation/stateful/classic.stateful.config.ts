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
 * Config set for the detection-watch-rule-creation eval suite. The suite measures the
 * managed rule-creation workflow the alertzero plugin installs at start, so alertzero must be
 * enabled. `xpack.alertzero.enabled` now defaults to `true` and is kept below only to pin the
 * kill switch explicitly; the suite touches no `/internal/alertzero/*` route, so the per-space
 * `securitySolution:enableAlertZero` setting does not need an override. The workflow's ai.agent
 * step additionally requires the Workflows UI and
 * agent settings, and the approval-gate tests respond to the review step through the
 * inbox plugin's respond route, which is also disabled by default.
 *
 * `agenticInvestigations` is a **required** plugin of alertzero (added in #290329) and defaults
 * to `enabled: false`. Without this flag Kibana cascade-disables alertzero entirely, so
 * `initialize_managed_workflows.ts` never runs and the rule-creation workflow is never installed.
 * Nothing in the eval suite calls an `agenticInvestigations` route directly, but the flag is
 * load-bearing and must not be removed.
 */
export const servers: ScoutServerConfig = {
  ...evalsTracingConfig,
  kbnTestServer: {
    ...evalsTracingConfig.kbnTestServer,
    serverArgs: [
      ...evalsTracingConfig.kbnTestServer.serverArgs,
      '--xpack.alertzero.enabled=true',
      '--xpack.agenticInvestigations.enabled=true',
      '--xpack.inbox.enabled=true',
      '--uiSettings.overrides.workflows:ui:enabled=true',
      '--uiSettings.overrides.workflows:aiAgent:enabled=true',
    ],
  },
};
