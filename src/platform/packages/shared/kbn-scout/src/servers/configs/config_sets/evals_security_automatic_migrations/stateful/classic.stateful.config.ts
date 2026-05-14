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
 * Custom Scout stateful server configuration for the Security Automatic
 * Migrations Agent Builder eval suite. Enables the Agent Builder experimental
 * features UI setting and the `automaticMigrationSkillsEnabled` experimental
 * flag so the migration correction + context skills (and their backing tools)
 * register with the Agent Builder runtime when the Scout-managed Kibana boots.
 *
 * Usage:
 *   node scripts/scout start-server --arch stateful --domain classic \
 *     --serverConfigSet evals_security_automatic_migrations
 */
export const servers: ScoutServerConfig = {
  ...evalsTracingConfig,
  kbnTestServer: {
    ...evalsTracingConfig.kbnTestServer,
    serverArgs: [
      ...evalsTracingConfig.kbnTestServer.serverArgs,
      '--uiSettings.overrides.agentBuilder:experimentalFeatures=true',
      `--xpack.securitySolution.enableExperimental=${JSON.stringify([
        'automaticMigrationSkillsEnabled',
      ])}`,
    ],
  },
};
