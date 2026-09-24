/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { existsSync } from 'fs';
import type { ScoutServerConfig } from '../../../../types';

const createInvestigationConfig = (
  tracing: ScoutServerConfig,
  sandboxKibanaConfig: string
): ScoutServerConfig => {
  if (!existsSync(sandboxKibanaConfig)) {
    throw new Error(`SANDBOX_KIBANA_CONFIG references a missing file: ${sandboxKibanaConfig}`);
  }

  return {
    ...tracing,
    kbnTestServer: {
      ...tracing.kbnTestServer,
      serverArgs: [
        ...tracing.kbnTestServer.serverArgs,
        '--xpack.nightshift_investigations.enabled=true',
        '--feature_flags.overrides.nightshift.enabled=true',
        '--xpack.nightshift_investigations.cortex.enabled=false',
        `--config=${sandboxKibanaConfig}`,
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

/**
 * Enables the investigation engine and its sandbox connection on top of an `evals_tracing` config.
 * The suite's scout hook exports SANDBOX_KIBANA_CONFIG (and the SANDBOX_* credentials it reads) only
 * when sandbox credentials are configured; without it the plain tracing config is returned.
 */
export const withNightshiftInvestigations = (tracing: ScoutServerConfig): ScoutServerConfig => {
  const sandboxKibanaConfig = process.env.SANDBOX_KIBANA_CONFIG;
  return sandboxKibanaConfig ? createInvestigationConfig(tracing, sandboxKibanaConfig) : tracing;
};
