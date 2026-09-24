/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutServerConfig } from '../../../../types';

const EIS_QA_URL = 'https://inference.eu-west-1.aws.svc.qa.elastic.cloud';

const defaultExporters = JSON.stringify([
  {
    http: {
      url: 'http://localhost:4318/v1/traces',
    },
  },
  {
    phoenix: {
      base_url: 'http://localhost:6006',
      public_url: 'http://localhost:6006',
      project_name: 'kibana-evals',
    },
  },
]);

/**
 * Layers the evals settings over a stateful or serverless base config: the evals plugin, EIS QA,
 * and OTLP trace exporting to a local OpenTelemetry collector (e.g. `node scripts/edot_collector.js`)
 * or the exporters in `TRACING_EXPORTERS`.
 */
export const withEvalsTracing = (baseConfig: ScoutServerConfig): ScoutServerConfig => {
  // When TRACING_EXPORTERS is set (e.g. in CI), use it instead of the localhost defaults.
  const { TRACING_EXPORTERS: tracingExporters } = process.env;
  if (tracingExporters) {
    JSON.parse(tracingExporters); // validate parseable JSON; throws early if malformed
  }
  const isCi = Boolean(process.env.CI);
  const shouldEnableTracing = Boolean(tracingExporters) || !isCi;
  const exporters = tracingExporters ?? defaultExporters;

  return {
    ...baseConfig,
    esTestCluster: {
      ...baseConfig.esTestCluster,
      serverArgs: [
        ...baseConfig.esTestCluster.serverArgs,
        `xpack.inference.elastic.url=${EIS_QA_URL}`,
      ],
    },
    kbnTestServer: {
      ...baseConfig.kbnTestServer,
      env: {
        ...baseConfig.kbnTestServer.env,
        ...(shouldEnableTracing
          ? {
              ELASTIC_APM_ACTIVE: 'false',
              ELASTIC_APM_CONTEXT_PROPAGATION_ONLY: 'false',
            }
          : {}),
      },
      serverArgs: [
        ...baseConfig.kbnTestServer.serverArgs,
        '--xpack.evals.enabled=true',
        ...(shouldEnableTracing
          ? [
              '--elastic.apm.active=false',
              '--elastic.apm.contextPropagationOnly=false',
              '--telemetry.enabled=true',
              '--telemetry.tracing.enabled=true',
              '--telemetry.tracing.sample_rate=1',
              `--telemetry.tracing.exporters=${exporters}`,
              /* Disable tracing redaction so exported spans carry real prompt/response and
               * tool-call content when inspecting eval runs in Kibana's Tracing UI.
               * Every config set that extends this one (agent-builder, security, workflows,
               * entity-analytics, etc.) inherits these overrides, so `Skill Invoked` / `Tool Calls`
               * evaluators stop reading empty tool-call attributes across the board. */
              '--uiSettings.overrides.agentBuilder:tracing:includeUserPrompts=true',
              '--uiSettings.overrides.agentBuilder:tracing:includeSystemPrompt=true',
              '--uiSettings.overrides.agentBuilder:tracing:includeLlmResponses=true',
              '--uiSettings.overrides.agentBuilder:tracing:includeToolDetails=true',
              '--uiSettings.overrides.agentBuilder:tracing:includeRealNames=true',
              '--uiSettings.overrides.agentBuilder:tracing:includeRealIds=true',
            ]
          : []),
      ],
    },
  };
};
