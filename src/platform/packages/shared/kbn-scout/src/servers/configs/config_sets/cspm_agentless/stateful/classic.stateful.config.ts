/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutServerConfig } from '../../../../../types';
import { defaultConfig } from '../../default/stateful/base.config';
import { cspmAgentlessServerArgs } from '../shared';

/**
 * Custom Scout server configuration for Cloud Security Posture Management (CSPM)
 * with Agentless and Cloud Connector support enabled.
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
  ...defaultConfig,

  kbnTestServer: {
    ...defaultConfig.kbnTestServer,
    serverArgs: [
      ...defaultConfig.kbnTestServer.serverArgs,
      ...cspmAgentlessServerArgs,

      // Cloud settings required for cloud connectors and agentless (stateful only)
      '--xpack.cloud.id=scout_cspm_test:dXMtZWFzdC0xLmF3cy5lbGFzdGljLWNsb3VkLmNvbSQxMjM0NTY3ODkwYWJjZGVmMTIzNDU2Nzg5MGFiY2RlZiRhYmNkZWYxMjM0NTY3ODkwYWJjZGVmMTIzNDU2Nzg5MA==',
      '--xpack.cloud.base_url=https://cloud.elastic.co',
      '--xpack.cloud.deployment_url=/deployments/scout-cspm-test',
    ],
  },
};
