/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { existsSync } from 'fs';
import { join } from 'path';
import type { ScoutServerConfig } from '../../../../types';

const exporterPrefix = '--telemetry.tracing.exporters=';

// Keep trace exporter credentials out of Kibana process arguments: kibana.tracing.yml reads them
// from the environment instead.
const withSafeTracing = (tracing: ScoutServerConfig): ScoutServerConfig => {
  const parentArgs = tracing.kbnTestServer.serverArgs;
  const exporters = parentArgs
    .find((arg) => arg.startsWith(exporterPrefix))
    ?.slice(exporterPrefix.length);
  return {
    ...tracing,
    kbnTestServer: {
      ...tracing.kbnTestServer,
      env: {
        ...tracing.kbnTestServer.env,
        NIGHTSHIFT_TRACING_EXPORTERS: exporters ?? '[]',
      },
      serverArgs: [
        ...parentArgs.filter((arg) => !arg.startsWith(exporterPrefix)),
        `--config=${join(__dirname, 'kibana.tracing.yml')}`,
      ],
    },
  };
};

const createInvestigationConfig = (
  safeTracing: ScoutServerConfig,
  sandboxKibanaConfig: string
): ScoutServerConfig => {
  if (!existsSync(sandboxKibanaConfig)) {
    throw new Error(`SANDBOX_KIBANA_CONFIG references a missing file: ${sandboxKibanaConfig}`);
  }

  // The suite's connector set: preconfigured connectors the eval saves on the investigator.
  const connectorsConfig = process.env.NIGHTSHIFT_CONNECTORS_KIBANA_CONFIG;
  if (connectorsConfig && !existsSync(connectorsConfig)) {
    throw new Error(
      `NIGHTSHIFT_CONNECTORS_KIBANA_CONFIG references a missing file: ${connectorsConfig}`
    );
  }

  return {
    ...safeTracing,
    kbnTestServer: {
      ...safeTracing.kbnTestServer,
      serverArgs: [
        ...safeTracing.kbnTestServer.serverArgs,
        // Allow sixteen investigation workflows plus five background tasks.
        '--xpack.task_manager.capacity=21',
        '--xpack.nightshift_investigations.enabled=true',
        // Investigations only run as the Nightshift agent service account.
        '--xpack.security.serviceAccounts.enabled=true',
        '--xpack.agenticInvestigations.enabled=true',
        '--xpack.proposals.enabled=true',
        '--feature_flags.overrides.nightshift.enabled=true',
        // The suite judges investigations offline; online evals would run its judges again on every one.
        '--feature_flags.overrides.nightshift.onlineEvals.paused=true',
        '--xpack.nightshift_investigations.cortex.enabled=false',
        '--xpack.nightshift_investigations.memory.enabled=false',
        '--xpack.nightshift_investigations.findings_recorder.enabled=false',
        `--config=${sandboxKibanaConfig}`,
        ...(connectorsConfig ? [`--config=${connectorsConfig}`] : []),
        '--uiSettings.overrides.workflows:ui:enabled=true',
        '--uiSettings.overrides.workflows:aiAgent:enabled=true',
        // The tracing config set already lifts the content redaction settings.
        '--uiSettings.overrides.agentBuilder:tracing:enabled=true',
        '--uiSettings.overrides.agentBuilder:tracing:includeUserData=true',
      ],
    },
  };
};

/**
 * Enables the investigation engine and its sandbox connection on top of an `evals_tracing` config.
 * The suite's scout hook exports SANDBOX_KIBANA_CONFIG (and the SANDBOX_* credentials it reads) only
 * when sandbox credentials are configured; without it only tracing is configured.
 */
export const withNightshiftInvestigations = (tracing: ScoutServerConfig): ScoutServerConfig => {
  const safeTracing = withSafeTracing(tracing);
  const sandboxKibanaConfig = process.env.SANDBOX_KIBANA_CONFIG;
  return sandboxKibanaConfig
    ? createInvestigationConfig(safeTracing, sandboxKibanaConfig)
    : safeTracing;
};
