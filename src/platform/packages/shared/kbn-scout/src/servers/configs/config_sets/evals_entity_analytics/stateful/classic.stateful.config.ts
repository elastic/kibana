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
 * Custom Scout stateful server configuration that enables AI Agents and experimental features.
 *
 * Usage:
 *   node scripts/scout.js start-server --stateful --config-dir evals_entity_analytics
 */
export const servers: ScoutServerConfig = {
  ...evalsTracingConfig,
  kbnTestServer: {
    ...evalsTracingConfig.kbnTestServer,
    serverArgs: [
      ...evalsTracingConfig.kbnTestServer.serverArgs,
      '--feature_flags.overrides.aiAssistant.aiAgents.enabled=true',
      `--uiSettings.overrides.agentBuilder:experimentalFeatures=true`,
    ],
  },
};
