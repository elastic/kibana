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

export const servers: ScoutServerConfig = {
  ...evalsTracingConfig,
  kbnTestServer: {
    ...evalsTracingConfig.kbnTestServer,
    serverArgs: [
      ...evalsTracingConfig.kbnTestServer.serverArgs,
      // PND plugin (Forensics/Triage Watch) — without this the watch routes 404.
      '--xpack.pnd.enabled=true',
      '--feature_flags.overrides.aiAssistant.aiAgents.enabled=true',
      '--feature_flags.overrides.securitySolution.attackDiscoveryWorkflowsEnabled=true',
      '--uiSettings.overrides.agentBuilder:experimentalFeatures=true',
      '--uiSettings.overrides.securitySolution:enableAttackDiscoveryWorkflows=true',
    ],
  },
};
