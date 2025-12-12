/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as http from 'http';
import { CA_CERT_PATH, KBN_CERT_PATH, KBN_KEY_PATH } from '@kbn/dev-utils';
import type { ScoutServerConfig } from '../../../../../types';
import { defaultConfig } from '../../../default/stateful/base.config';

/**
 * Create mock Agentless API server
 * Inlined here to avoid import/compilation issues
 */
const setupMockAgentlessServer = () => {
  // Store created deployments in memory
  const deployments: Array<{ policy_id: string; revision_idx?: number }> = [];

  return http.createServer((req, res) => {
    // eslint-disable-next-line no-console
    console.log(`[Mock Agentless API] ${req.method} ${req.url}`);

    // Handle POST /api/v1/ess/deployments
    if (req.method === 'POST' && req.url === '/api/v1/ess/deployments') {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk.toString();
      });
      req.on('end', () => {
        // eslint-disable-next-line no-console
        console.log('[Mock Agentless API] ✅ Handling POST /api/v1/ess/deployments');
        try {
          const parsedBody = JSON.parse(body);
          const policyId = parsedBody.policy_id;

          // Store the deployment
          if (policyId) {
            deployments.push({ policy_id: policyId, revision_idx: 1 });
            // eslint-disable-next-line no-console
            console.log(`[Mock Agentless API] 📝 Stored deployment for policy: ${policyId}`);
          }
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error('[Mock Agentless API] ⚠️  Failed to parse request body', e);
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ code: 'SUCCESS', error: null }));
      });
      return;
    }

    // Handle GET /api/v1/ess/deployments
    if (req.method === 'GET' && req.url?.startsWith('/api/v1/ess/deployments')) {
      // eslint-disable-next-line no-console
      console.log('[Mock Agentless API] ✅ Handling GET /api/v1/ess/deployments');
      // eslint-disable-next-line no-console
      console.log(`[Mock Agentless API] 📋 Returning ${deployments.length} deployment(s)`);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ deployments }));
      return;
    }

    // Handle DELETE /api/v1/ess/deployments/:id
    if (req.method === 'DELETE' && req.url?.startsWith('/api/v1/ess/deployments/')) {
      // eslint-disable-next-line no-console
      console.log(`[Mock Agentless API] ✅ Handling DELETE ${req.url}`);

      // Extract policy_id from URL
      const policyId = req.url.split('/').pop();
      if (policyId) {
        const index = deployments.findIndex((d) => d.policy_id === policyId);
        if (index > -1) {
          deployments.splice(index, 1);
          // eslint-disable-next-line no-console
          console.log(`[Mock Agentless API] 🗑️  Removed deployment for policy: ${policyId}`);
        }
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ code: 'SUCCESS', error: null }));
      return;
    }

    // Handle PUT /api/v1/ess/deployments/:id
    if (req.method === 'PUT' && req.url?.startsWith('/api/v1/ess/deployments/')) {
      // eslint-disable-next-line no-console
      console.log(`[Mock Agentless API] ✅ Handling PUT ${req.url}`);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ code: 'SUCCESS', error: null }));
      return;
    }

    // Default 404 response
    // eslint-disable-next-line no-console
    console.log(`[Mock Agentless API] ❌ 404 Not Found: ${req.method} ${req.url}`);
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  });
};

/**
 * Custom Scout server configuration for Cloud Security Posture Management (CSPM)
 * with Agentless and Cloud Connector support enabled.
 *
 * This configuration enables:
 * - Fleet agentless integration
 * - Cloud connectors for AWS, Azure, and GCP
 * - Mock agentless API endpoint (via auxiliary server)
 * - Cloud environment simulation
 */
export const servers: ScoutServerConfig = {
  ...defaultConfig,

  // Declare auxiliary servers that Scout will automatically start/stop
  auxiliaryServers: [
    {
      name: 'mock-agentless-api',
      port: 8089,

      // All startup logic and error handling is implemented here
      startServer: async (log) => {
        const server = setupMockAgentlessServer();
        const port = 8089;
        const name = 'mock-agentless-api';

        await new Promise<void>((resolve, reject) => {
          server.listen(port, () => {
            log.success(`[${name}] Started successfully on http://localhost:${port}`);
            resolve();
          });

          server.on('error', (err: NodeJS.ErrnoException) => {
            if (err.code === 'EADDRINUSE') {
              log.error(
                `[${name}] Port ${port} is already in use. ` +
                  `Kill the process with: lsof -ti:${port} | xargs kill -9`
              );
            } else {
              log.error(`[${name}] Failed to start: ${err.message}`);
            }
            reject(err);
          });
        });

        return server;
      },
    },
  ],

  kbnTestServer: {
    ...defaultConfig.kbnTestServer,
    serverArgs: [
      ...defaultConfig.kbnTestServer.serverArgs,

      // Enable agentless integration in Fleet
      '--xpack.fleet.agentless.enabled=true',
      // Point to mock agentless API server (started automatically by Scout)
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

      // Cloud settings required for cloud connectors and agentless
      // These simulate a cloud/hosted environment (required for isAgentlessEnabled() check)
      '--xpack.cloud.id=scout_cspm_test:dXMtZWFzdC0xLmF3cy5lbGFzdGljLWNsb3VkLmNvbSQxMjM0NTY3ODkwYWJjZGVmMTIzNDU2Nzg5MGFiY2RlZiRhYmNkZWYxMjM0NTY3ODkwYWJjZGVmMTIzNDU2Nzg5MA==',
      '--xpack.cloud.base_url=https://cloud.elastic.co',
      '--xpack.cloud.deployment_url=/deployments/scout-cspm-test',

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
