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
 * enabled; `xpack.alertzero.enabled` is on by default in stateful, so it needs no flag. Alertzero
 * installs its managed workflows only when service accounts are enabled, so
 * `serviceAccountsServerArgs` is kept. The suite binds the Rule Coverage worker through
 * `/internal/alertzero/workers`, so the per-space `securitySolution:enableAlertZero` setting
 * (default `false`) is overridden on. The workflow's ai.agent step additionally requires the
 * Workflows UI and agent settings.
 *
 * AlertZero routes also 404 outside a Security solution space (#300822), and a stateful stack
 * creates its Default space with no solution. `xpack.spaces.defaultSolution=security` makes the
 * Default space a Security space when it is created at boot.
 *
 * `agenticInvestigations` and `proposals` are required by the rule-creation flow: the workflow
 * raises its draft as a proposal and the approval-gate specs decide it through the proposals API.
 * Both default to on in stateful; the flags stay explicit so a default change cannot silently
 * cascade-disable alertzero. The inbox plugin is enabled as on main.
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
      '--uiSettings.overrides.securitySolution:enableAlertZero=true',
      '--xpack.spaces.defaultSolution=security',
      '--xpack.agenticInvestigations.enabled=true',
      '--xpack.proposals.enabled=true',
      '--xpack.inbox.enabled=true',
      '--xpack.securitySolution.enableExperimental=["rulePreviewAttachmentEnabled"]',
      '--uiSettings.overrides.workflows:ui:enabled=true',
      '--uiSettings.overrides.workflows:aiAgent:enabled=true',
    ],
  },
};
