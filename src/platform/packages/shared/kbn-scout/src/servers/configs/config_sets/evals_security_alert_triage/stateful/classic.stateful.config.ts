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

/**
 * Scout stateful config for security-alert-triage evals.
 * Enables OTLP tracing export, Agent Builder experimental features, and Entity Store V2
 * (entity-analytics skill with security.get_entity / security.search_entities).
 *
 * Usage:
 *   node scripts/scout.js start-server --arch stateful --domain classic --serverConfigSet evals_security_alert_triage
 */
export const servers: ScoutServerConfig = {
  ...evalsTracingConfig,
  kbnTestServer: {
    ...evalsTracingConfig.kbnTestServer,
    serverArgs: [
      ...evalsTracingConfig.kbnTestServer.serverArgs,
      '--feature_flags.overrides.aiAssistant.aiAgents.enabled=true',
      '--uiSettings.overrides.agentBuilder:experimentalFeatures=true',
      `--uiSettings.overrides.securitySolution:entityStoreEnableV2=true`,
      `--xpack.securitySolution.enableExperimental=${JSON.stringify([
        'entityAnalyticsEntityStoreV2',
      ])}`,
    ],
  },
};
