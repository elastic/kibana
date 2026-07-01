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
      '--uiSettings.overrides.agentBuilder:experimentalFeatures=true',
      `--xpack.securitySolution.enableExperimental=${JSON.stringify([
        'automaticTroubleshootingSkill',
        'endpointForensicAnalysisSkill',
      ])}`,
      '--xpack.fleet.packages.0.name=endpoint',
      '--xpack.fleet.packages.0.version=latest',
      // Agent Builder inference/tool spans (load_skill, execute_tool) — required for L1 Skill Invoked evaluators.
      '--xpack.agentBuilder.tracing.send_to_self=true',
      '--xpack.agentBuilder.tracing.scheduledDelay=50',
      '--xpack.agentBuilder.tracing.exporters=[{"url":"http://localhost:4318/v1/traces"}]',
    ],
  },
};
