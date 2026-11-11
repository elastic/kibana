/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutServerConfig } from '../../../../../types';
import { servers as baseConfig } from '../../default/serverless/observability_complete.serverless.config';

/**
 * Scout server configuration for Workflow Schema OOM prevention tests (serverless observability).
 * Constrains Kibana to 1 GB heap to catch memory regressions in the
 * workflow schema (connectors whitelist, Zod schema, YAML validation).
 */
export const servers: ScoutServerConfig = {
  ...baseConfig,
  kbnTestServer: {
    ...baseConfig.kbnTestServer,
    env: {
      ...baseConfig.kbnTestServer.env,
      NODE_OPTIONS: [baseConfig.kbnTestServer.env?.NODE_OPTIONS, '--max-old-space-size=1024']
        .filter(Boolean)
        .join(' '),
    },
  },
};
