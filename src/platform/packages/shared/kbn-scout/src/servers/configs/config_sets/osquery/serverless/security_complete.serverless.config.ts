/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { CA_TRUSTED_FINGERPRINT } from '@kbn/dev-utils';
import type { ScoutServerConfig } from '../../../../../types';
import { servers as securityServerlessConfig } from '../../default/serverless/security_complete.serverless.config';

/**
 * Custom Scout server configuration for Osquery tests in serverless security_complete.
 *
 * Extends the default security_complete serverless config with:
 * - Fleet Server host pointing to host.docker.internal:8220 so Docker agents can reach it.
 * - Fleet default output pointing to es01 (the serverless ES Docker node) on the
 *   shared `elastic` Docker network — serverless ES containers bind their HTTP port
 *   to 127.0.0.1 on the host, so host.docker.internal is unreachable from other
 *   containers; containers on the `elastic` network reach es01 directly by hostname.
 *   The output carries `ca_trusted_fingerprint` and `ssl.verification_mode: 'none'`
 *   so Elastic Agents can validate / skip-validate the self-signed serverless ES
 *   certificate when writing monitoring and osquery result data. Mirrors the known-
 *   good pattern used by security_solution Cypress in
 *   `x-pack/solutions/security/plugins/security_solution/scripts/run_cypress/get_ftr_config.ts`.
 * - Pre-installation of the osquery_manager integration at Kibana startup.
 *
 * We override xpack.fleet.fleetServerHosts / xpack.fleet.outputs rather than
 * xpack.fleet.agents.elasticsearch.host because the default config already defines
 * xpack.fleet.outputs and the two settings are mutually exclusive.
 */
const kbnServerArgsWithoutFleetHosts = securityServerlessConfig.kbnTestServer.serverArgs.filter(
  (arg: string) =>
    !arg.startsWith('--xpack.fleet.fleetServerHosts=') && !arg.startsWith('--xpack.fleet.outputs=')
);

export const servers: ScoutServerConfig = {
  ...securityServerlessConfig,

  kbnTestServer: {
    ...securityServerlessConfig.kbnTestServer,
    serverArgs: [
      ...kbnServerArgsWithoutFleetHosts,
      `--xpack.fleet.fleetServerHosts=${JSON.stringify([
        {
          id: 'default-fleet-server',
          name: 'Default Fleet Server',
          is_default: true,
          host_urls: ['https://host.docker.internal:8220'],
        },
      ])}`,
      `--xpack.fleet.outputs=${JSON.stringify([
        {
          id: 'es-default-output',
          name: 'Default Output',
          type: 'elasticsearch',
          is_default: true,
          is_default_monitoring: true,
          hosts: [`https://es01:${securityServerlessConfig.servers.elasticsearch.port}`],
          ca_trusted_fingerprint: CA_TRUSTED_FINGERPRINT,
          config: {
            ssl: {
              verification_mode: 'none',
            },
          },
        },
      ])}`,
      '--xpack.fleet.packages.0.name=osquery_manager',
      '--xpack.fleet.packages.0.version=latest',
    ],
  },
};
