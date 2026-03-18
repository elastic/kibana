/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { servers as evalsTracingConfig } from '../../evals_tracing/stateful/classic.stateful.config';
import type { ScoutServerConfig } from '../../../../../types';

/**
 * Custom Scout stateful server configuration for Entity Analytics V2 evals.
 * Enables AI Agents, the Entity Store V2 experimental feature flag, and eval tracing.
 *
 * Usage:
 *   node scripts/scout start-server --arch stateful --domain classic --serverConfigSet evals_entity_analytics_v2
 *
 * Note: Requires entity store V2 to be initialised before running. Use the populate
 * script from security-documents-generator to seed entities:
 *   yarn start organization-quick && yarn start generate-entity-maintainers-data --quick
 */
export const servers: ScoutServerConfig = {
  ...evalsTracingConfig,
  kbnTestServer: {
    ...evalsTracingConfig.kbnTestServer,
    serverArgs: [
      ...evalsTracingConfig.kbnTestServer.serverArgs,
      '--xpack.evals.enabled=true',
      '--xpack.actions.responseTimeout=120s',
      '--feature_flags.overrides.aiAssistant.aiAgents.enabled=true',
      `--uiSettings.overrides.agentBuilder:experimentalFeatures=true`,
      `--uiSettings.overrides.securitySolution:entityStoreEnableV2=true`,
      `--xpack.securitySolution.enableExperimental=["entityAnalyticsEntityStoreV2"]`,
    ],
  },
};
