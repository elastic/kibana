/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { join } from 'path';
import type { ScoutServerConfig } from '../../../../types';

const EXPORTERS_ARG_PREFIX = '--xpack.agentBuilder.tracing.exporters=';

const isHttpUrl = (value: unknown): boolean => {
  if (typeof value !== 'string') return false;
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol);
  } catch {
    return false;
  }
};

const isStringRecord = (value: unknown): boolean =>
  typeof value === 'object' &&
  value !== null &&
  !Array.isArray(value) &&
  Object.values(value).every((header) => typeof header === 'string');

// Mirrors `xpack.agentBuilder.tracing.exporters` in the Agent Builder config schema, so a value
// Kibana would reject at boot fails here, before the stack starts.
const assertAgentBuilderExporters = (exporters: unknown): void => {
  const valid =
    Array.isArray(exporters) &&
    exporters.every((exporter) => {
      if (typeof exporter !== 'object' || exporter === null) return false;
      const { url, headers } = exporter as { url?: unknown; headers?: unknown };
      return isHttpUrl(url) && (headers === undefined || isStringRecord(headers));
    });
  if (!valid) {
    throw new Error(
      'AGENT_BUILDER_TRACING_EXPORTERS must be a JSON array of objects with an http(s) "url" and ' +
        'optional string-valued "headers", e.g. [{"url":"https://host/v1/traces"}]'
    );
  }
};

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
 *   The value is JSON in the shape of `xpack.agentBuilder.tracing.exporters`: an array of
 *   `{ "url": "<http(s) OTLP traces URL>", "headers"?: { "<name>": "<value>" } }`. This is NOT the
 *   `TRACING_EXPORTERS` telemetry shape (`[{ "grpc": { "url": ... } }]`), which Kibana would reject
 *   at boot. Headers carry credentials and Scout logs Kibana's argv, so the value reaches Kibana
 *   through the environment and `kibana.tracing.yml`, never as a `--xpack...` argument.
 *
 * Inherited copies of these args are dropped first, so the value is deterministic regardless of
 * arg ordering.
 */
export const withEvalsSecurity = (baseConfig: ScoutServerConfig): ScoutServerConfig => {
  const { AGENT_BUILDER_TRACING_EXPORTERS: agentBuilderTracingExporters } = process.env;
  if (agentBuilderTracingExporters) {
    assertAgentBuilderExporters(JSON.parse(agentBuilderTracingExporters));
  }

  const overrides = [
    '--uiSettings.overrides.genAiSettings:tokenUsageTracking=true',
    '--uiSettings.overrides.agentBuilder:tracing:includeUserData=true',
    '--uiSettings.overrides.agentBuilder:tracing:includeToolDetails=true',
    ...(agentBuilderTracingExporters ? [`--config=${join(__dirname, 'kibana.tracing.yml')}`] : []),
  ];
  // The exporters arg is always dropped, so an inherited copy never puts credentials in argv.
  const overriddenNames = new Set([...overrides.map(argName), EXPORTERS_ARG_PREFIX]);

  return {
    ...baseConfig,
    kbnTestServer: {
      ...baseConfig.kbnTestServer,
      ...(agentBuilderTracingExporters
        ? {
            env: {
              ...baseConfig.kbnTestServer.env,
              AGENT_BUILDER_TRACING_EXPORTERS: agentBuilderTracingExporters,
            },
          }
        : {}),
      serverArgs: [
        ...baseConfig.kbnTestServer.serverArgs.filter((arg) => !overriddenNames.has(argName(arg))),
        ...overrides,
      ],
    },
  };
};
