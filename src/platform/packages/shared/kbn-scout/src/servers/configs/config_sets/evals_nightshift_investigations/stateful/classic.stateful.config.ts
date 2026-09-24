/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { existsSync } from 'fs';
import type { ScoutServerConfig } from '../../../../../types';
import { servers as tracing } from '../../evals_tracing/stateful/classic.stateful.config';

const createInvestigationConfig = (sandboxKibanaConfig: string): ScoutServerConfig => {
  if (!existsSync(sandboxKibanaConfig)) {
    throw new Error(`SANDBOX_KIBANA_CONFIG references a missing file: ${sandboxKibanaConfig}`);
  }

  const telemetryConfig = process.env.NIGHTSHIFT_TELEMETRY_KIBANA_CONFIG;
  if (telemetryConfig && !existsSync(telemetryConfig)) {
    throw new Error(
      `NIGHTSHIFT_TELEMETRY_KIBANA_CONFIG references a missing file: ${telemetryConfig}`
    );
  }
  const exporterPrefix = '--telemetry.tracing.exporters=';
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
        // Allow sixteen investigation workflows plus five background tasks.
        '--xpack.task_manager.capacity=21',
        '--xpack.nightshift_investigations.enabled=true',
        '--feature_flags.overrides.nightshift.enabled=true',
        '--xpack.nightshift_investigations.cortex.enabled=false',
        `--config=${sandboxKibanaConfig}`,
        ...(telemetryConfig ? [`--config=${telemetryConfig}`] : []),
        '--uiSettings.overrides.workflows:ui:enabled=true',
        '--uiSettings.overrides.workflows:aiAgent:enabled=true',
        '--uiSettings.overrides.agentBuilder:experimentalFeatures=true',
        // The tracing config set already lifts the content redaction settings.
        '--uiSettings.overrides.agentBuilder:tracing:enabled=true',
        '--uiSettings.overrides.agentBuilder:tracing:includeUserData=true',
      ],
    },
  };
};

// The suite's scout hook exports SANDBOX_KIBANA_CONFIG (and the SANDBOX_* credentials it reads) only
// when sandbox credentials are configured. Without it only the smoke eval runs, on plain tracing.
const sandboxKibanaConfig = process.env.SANDBOX_KIBANA_CONFIG;

export const servers: ScoutServerConfig = sandboxKibanaConfig
  ? createInvestigationConfig(sandboxKibanaConfig)
  : tracing;
