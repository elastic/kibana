/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutServerConfig } from '../../../../../types';
import { defaultConfig } from '../../../default/stateful/base.config';

/**
 * Custom Scout server configuration for OAS (OpenAPI Specification) schema validation tests.
 * Enables the OAS endpoint which is required for schema validation.
 *
 * This config is automatically used when running tests from:
 * dashboard/test/scout_oas_schema/
 *
 * Usage:
 *   node scripts/scout.js start-server --stateful --config-dir oas_schema
 */
export const servers: ScoutServerConfig = {
  ...defaultConfig,
  kbnTestServer: {
    ...defaultConfig.kbnTestServer,
    serverArgs: [
      ...defaultConfig.kbnTestServer.serverArgs,
      // Enable OpenAPI specification endpoint for schema validation tests
      '--server.oas.enabled=true',
    ],
  },
};
