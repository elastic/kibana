/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutServerConfig } from '../../../../types';

const argName = (arg: string): string => arg.slice(0, arg.indexOf('=') + 1);

/**
 * Layers the observability every Security eval needs over an `evals_tracing` config:
 * - token usage tracking, which is off by default and read-only in the UI. With it on, every
 *   inference call an eval makes writes a token-usage doc, so a run's cost can be compared across
 *   models.
 * - the remaining Agent Builder tracing privacy override, `includeUserData`.
 * - `includeToolDetails`, unconditionally. `evals_tracing` only sets it when tracing is enabled,
 *   so a CI run without `TRACING_EXPORTERS` loses `gen_ai.tool.call.arguments`/`.result` and
 *   `SkillInvoked` scores 0 for every model, which reads as a model failure.
 * - `AGENT_BUILDER_TRACING_EXPORTERS`: Agent Builder keeps its own tracer provider whose spans back
 *   the trace-based evaluators and always exports to the local ES. Exporters set here are appended
 *   to that, so a remote destination (e.g. a golden cluster) is added without losing local fidelity.
 *
 * Inherited copies of these args are dropped first, so the value is deterministic regardless of
 * arg ordering.
 */
export const withEvalsSecurity = (baseConfig: ScoutServerConfig): ScoutServerConfig => {
  const { AGENT_BUILDER_TRACING_EXPORTERS: agentBuilderTracingExporters } = process.env;
  if (agentBuilderTracingExporters) {
    JSON.parse(agentBuilderTracingExporters); // validate parseable JSON; throws early if malformed
  }

  const overrides = [
    '--uiSettings.overrides.genAiSettings:tokenUsageTracking=true',
    '--uiSettings.overrides.agentBuilder:tracing:includeUserData=true',
    '--uiSettings.overrides.agentBuilder:tracing:includeToolDetails=true',
    ...(agentBuilderTracingExporters
      ? [`--xpack.agentBuilder.tracing.exporters=${agentBuilderTracingExporters}`]
      : []),
  ];
  const overriddenNames = new Set(overrides.map(argName));

  return {
    ...baseConfig,
    kbnTestServer: {
      ...baseConfig.kbnTestServer,
      serverArgs: [
        ...baseConfig.kbnTestServer.serverArgs.filter((arg) => !overriddenNames.has(argName(arg))),
        ...overrides,
      ],
    },
  };
};
