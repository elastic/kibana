/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutServerConfig } from '../../../../../types';
import { servers as securityServerlessConfig } from '../../../default/serverless/security.serverless.config';
import { cspmAgentlessServerArgs } from '../shared';

/**
 * Custom Scout server configuration for Cloud Security Posture Management (CSPM)
 * with Agentless and Cloud Connector support enabled for Serverless.
 *
 * This configuration enables:
 * - Fleet agentless integration
 * - Cloud connectors for AWS, Azure, and GCP
 * - Cloud environment simulation
 *
 * Note: Tests use Playwright's page.route() to intercept API requests
 * and validate request shapes without requiring a mock server.
 */
export const servers: ScoutServerConfig = {
  ...securityServerlessConfig,

  kbnTestServer: {
    ...securityServerlessConfig.kbnTestServer,
    serverArgs: [...securityServerlessConfig.kbnTestServer.serverArgs, ...cspmAgentlessServerArgs],
  },
};
