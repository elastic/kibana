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

/**
 * Custom Scout server configuration for Osquery tests in serverless security mode.
 *
 * This configuration extends the default security serverless config and adds:
 * - Fleet Server host pointing to host.docker.internal:8220 so Docker agents can reach it
 * - Fleet output pointing to es01 (the first serverless ES Docker node) so agents connect
 *   via the shared `elastic` Docker network instead of host.docker.internal
 * - Pre-installation of the osquery_manager integration at Kibana startup
 *
 * Why es01 instead of host.docker.internal for ES?
 * The serverless ES containers bind their HTTP port to 127.0.0.1 on the host, so
 * host.docker.internal:9220 is unreachable from other Docker containers.
 * Containers on the `elastic` network can reach es01 directly by hostname.
 *
 * Note: We override xpack.fleet.fleetServerHosts and xpack.fleet.outputs (rather than
 * xpack.fleet.agents.elasticsearch.host) because the default config already defines
 * xpack.fleet.outputs and the two settings are mutually exclusive.
 */

// Filter out default Fleet host settings that use localhost — Docker containers cannot
// resolve localhost back to the host machine, so we replace them with host.docker.internal.
const kbnServerArgsWithoutFleetHosts = securityServerlessConfig.kbnTestServer.serverArgs.filter(
  (arg) =>
    !arg.startsWith('--xpack.fleet.fleetServerHosts=') && !arg.startsWith('--xpack.fleet.outputs=')
);

export const servers: ScoutServerConfig = {
  ...securityServerlessConfig,

  kbnTestServer: {
    ...securityServerlessConfig.kbnTestServer,
    serverArgs: [
      ...kbnServerArgsWithoutFleetHosts,
      // Fleet Server hosts pointing to host.docker.internal so Docker agents can reach it
      `--xpack.fleet.fleetServerHosts=${JSON.stringify([
        {
          id: 'default-fleet-server',
          name: 'Default Fleet Server',
          is_default: true,
          host_urls: ['https://host.docker.internal:8220'],
        },
      ])}`,
      // Default output pointing to the first serverless ES Docker node (es01) via the
      // `elastic` Docker network. We cannot use host.docker.internal because the serverless
      // ES containers only bind their HTTP port to 127.0.0.1 on the host.
      `--xpack.fleet.outputs=${JSON.stringify([
        {
          id: 'es-default-output',
          name: 'Default Output',
          type: 'elasticsearch',
          is_default: true,
          is_default_monitoring: true,
          hosts: [`https://es01:${securityServerlessConfig.servers.elasticsearch.port}`],
        },
      ])}`,
      // Pre-install osquery_manager integration at Kibana startup
      '--xpack.fleet.packages.0.name=osquery_manager',
      '--xpack.fleet.packages.0.version=latest',
    ],
  },
};
