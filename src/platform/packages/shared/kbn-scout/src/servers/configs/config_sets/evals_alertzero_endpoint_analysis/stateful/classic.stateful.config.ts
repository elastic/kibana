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
 * Config set for the AlertZero endpoint-analysis eval suite. The suite drives the managed
 * endpoint-analysis worker, so it needs alertzero and the plugins it requires
 * (`agenticInvestigations`, `proposals`; both default off and cascade-disable alertzero when
 * missing). Managed workflows install only when service accounts are enabled. The Context
 * Engine routes the suite uses to build its AI index fixture 404 unless `contextEngine:enabled`
 * is on, and the analysis `ai.agent` step needs the Workflows agent settings and Agent Builder
 * experimental features.
 *
 * Usage:
 *   node scripts/scout start-server --arch stateful --domain classic --serverConfigSet evals_alertzero_endpoint_analysis
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
      '--uiSettings.overrides.contextEngine:enabled=true',
      '--uiSettings.overrides.workflows:ui:enabled=true',
      '--uiSettings.overrides.workflows:aiAgent:enabled=true',
      '--uiSettings.overrides.agentBuilder:experimentalFeatures=true',
      // `withAlertZeroEnabled` gates every AlertZero route on the per-space
      // `securitySolution:enableAlertZero` advanced setting and 404s while it is off, so the
      // proposals API the L4 eval drives is unreachable without this override.
      '--uiSettings.overrides.securitySolution:enableAlertZero=true',
      // The endpoint-forensic skill (and its discover_telemetry tool) only registers under
      // this experimental flag; without it the L1 routing eval cannot find the tool at all.
      `--xpack.securitySolution.enableExperimental=${JSON.stringify([
        'endpointForensicAnalysisSkill',
      ])}`,
    ],
  },
};
