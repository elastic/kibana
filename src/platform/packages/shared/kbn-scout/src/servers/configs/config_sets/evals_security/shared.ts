/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutServerConfig } from '../../../../types';

const OVERRIDES = [
  '--uiSettings.overrides.genAiSettings:tokenUsageTracking=true',
  '--uiSettings.overrides.agentBuilder:tracing:includeUserData=true',
  '--uiSettings.overrides.agentBuilder:tracing:includeToolDetails=true',
];

const argName = (arg: string): string => arg.slice(0, arg.indexOf('=') + 1);

// `evals_tracing` only sets `includeToolDetails` when tracing is enabled, so a CI run without
// `TRACING_EXPORTERS` loses `gen_ai.tool.call.arguments` and `SkillInvoked` scores 0 for every model.
// Inherited copies of these args are dropped first, so each is set exactly once.
export const withEvalsSecurity = (baseConfig: ScoutServerConfig): ScoutServerConfig => {
  const overriddenNames = new Set(OVERRIDES.map(argName));

  return {
    ...baseConfig,
    kbnTestServer: {
      ...baseConfig.kbnTestServer,
      serverArgs: [
        ...baseConfig.kbnTestServer.serverArgs.filter((arg) => !overriddenNames.has(argName(arg))),
        ...OVERRIDES,
      ],
    },
  };
};
