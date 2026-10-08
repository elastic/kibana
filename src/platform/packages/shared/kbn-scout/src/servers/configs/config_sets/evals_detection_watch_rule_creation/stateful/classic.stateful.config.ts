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
 * Config set for the detection-watch-rule-creation eval suite. The suite measures the
 * managed rule-creation workflow the alertzero plugin installs at start, so alertzero must be
 * enabled. `xpack.alertzero.enabled` defaults to `false` so it is set explicitly below. Service
 * accounts are off by default too, and alertzero installs its managed workflows only when they
 * are enabled, so `serviceAccountsServerArgs` is equally load-bearing. The
 * suite touches no `/internal/alertzero/*` route, so the per-space
 * `securitySolution:enableAlertZero` setting does not need an override. The workflow's ai.agent
 * step additionally requires the Workflows UI and agent settings.
 *
 * `agenticInvestigations` and `proposals` are both **required** plugins of alertzero and both
 * default to `enabled: false`. Without either flag Kibana cascade-disables alertzero entirely, so
 * `initialize_managed_workflows.ts` never runs and the rule-creation workflow is never installed.
 * The approval-gate specs also decide the workflow's proposal through the proposals API.
 *
 * Since #295215 alertzero installs no managed workflows unless service accounts are enabled.
 *
 * Usage:
 *   node scripts/scout start-server --arch stateful --domain classic --serverConfigSet evals_detection_watch_rule_creation
 */
export const servers: ScoutServerConfig = {
  ...evalsTracingConfig,
  kbnTestServer: {
    ...evalsTracingConfig.kbnTestServer,
    serverArgs: [
      ...evalsTracingConfig.kbnTestServer.serverArgs,
      ...serviceAccountsServerArgs,
      '--xpack.alertzero.enabled=true',
      '--xpack.agenticInvestigations.enabled=true',
      '--xpack.proposals.enabled=true',
      '--xpack.securitySolution.enableExperimental=["rulePreviewAttachmentEnabled"]',
      '--uiSettings.overrides.workflows:ui:enabled=true',
      '--uiSettings.overrides.workflows:aiAgent:enabled=true',
    ],
  },
};
