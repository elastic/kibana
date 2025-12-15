/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { CA_CERT_PATH, KBN_CERT_PATH, KBN_KEY_PATH } from '@kbn/dev-utils';
import type { ScoutServerConfig } from '../../../../../types';
import { servers as securityServerlessConfig } from '../../../default/serverless/security.serverless.config';

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
    serverArgs: [
      ...securityServerlessConfig.kbnTestServer.serverArgs,

      // Enable agentless integration in Fleet
      '--xpack.fleet.agentless.enabled=true',
      // Agentless API URL - requests will be intercepted by Playwright in tests
      '--xpack.fleet.agentless.api.url=http://localhost:8089',
      // Use test certificates (Fleet Agentless client always enables SSL)
      `--xpack.fleet.agentless.api.tls.certificate=${KBN_CERT_PATH}`,
      `--xpack.fleet.agentless.api.tls.key=${KBN_KEY_PATH}`,
      `--xpack.fleet.agentless.api.tls.ca=${CA_CERT_PATH}`,

      // Enable Fleet experimental features for agentless
      `--xpack.fleet.enableExperimental=${JSON.stringify([
        'agentlessPoliciesAPI',
        'useAgentlessAPIInUI',
      ])}`,

      // Enable cloud connector feature flag in Security Solution
      '--uiSettings.overrides.securitySolution:enableCloudConnector=true',

      // Enable debug logging for troubleshooting
      `--logging.loggers=${JSON.stringify([
        {
          name: 'plugins.fleet.agentless',
          level: 'debug',
        },
        {
          name: 'plugins.fleet.agentless_policies',
          level: 'debug',
        },
        {
          name: 'plugins.fleet.cloud_connectors',
          level: 'debug',
        },
      ])}`,
    ],
  },
};
