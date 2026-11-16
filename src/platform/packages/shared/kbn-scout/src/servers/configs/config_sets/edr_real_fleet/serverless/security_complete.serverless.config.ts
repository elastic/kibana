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
import { servers as defaultConfig } from '../../default/serverless/security_complete.serverless.config';
import {
  EDR_REAL_FLEET_ES_PORT,
  EDR_REAL_FLEET_SERVER_PORT,
  getEdrRealFleetHostIp,
} from '../shared';

/**
 * Local serverless Security (complete) servers for live Elastic Defend enrollment.
 *
 * Same advertise-address idea as the stateful config in this set: Docker Fleet
 * Server and the Endpoint VM cannot reach Kibana or ES on localhost. ES is TLS
 * in serverless, so the output host stays `https`. Publishing the port on the
 * host IP and trusting the dev CA matches Defend Workflows Cypress
 * (`scripts/run_cypress/get_ftr_config.ts`).
 *
 *   node scripts/scout start-server --arch serverless --domain security_complete --serverConfigSet edr_real_fleet
 */
const hostIp = getEdrRealFleetHostIp();

if (hostIp === '0.0.0.0') {
  throw new Error(
    'EDR real-Fleet serverless needs a routable host IP. 0.0.0.0 makes Docker publish both 127.0.0.1:9220 and 0.0.0.0:9220, which fails with "address already in use". Set KIBANA_LOCALHOST_REAL_IP to a non-loopback IPv4 address.'
  );
}

const isDefaultFleetAdvertiseArg = (arg: string): boolean =>
  arg.startsWith('--xpack.fleet.fleetServerHosts=') || arg.startsWith('--xpack.fleet.outputs=');

export const servers: ScoutServerConfig = {
  ...defaultConfig,

  // Loopback publish is not enough: the Endpoint VM dials the host IP.
  esServerlessOptions: {
    ...defaultConfig.esServerlessOptions,
    uiam: defaultConfig.esServerlessOptions?.uiam ?? true,
    host: hostIp,
  },

  esTestCluster: {
    ...defaultConfig.esTestCluster,
    serverArgs: [
      ...defaultConfig.esTestCluster.serverArgs,
      // Docker Fleet Server and the Endpoint VM cannot reach ES on localhost.
      'http.host=0.0.0.0',
    ],
  },

  kbnTestServer: {
    ...defaultConfig.kbnTestServer,
    serverArgs: [
      ...defaultConfig.kbnTestServer.serverArgs.filter((arg) => !isDefaultFleetAdvertiseArg(arg)),
      `--xpack.fleet.fleetServerHosts=${JSON.stringify([
        {
          id: 'default-fleet-server',
          name: 'Default Fleet Server',
          is_default: true,
          host_urls: [`https://${hostIp}:${EDR_REAL_FLEET_SERVER_PORT}`],
        },
      ])}`,
      // Advertise ES via outputs only. Fleet rejects agents.elasticsearch.host
      // when a default output is already defined here.
      `--xpack.fleet.outputs=${JSON.stringify([
        {
          id: 'es-default-output',
          name: 'Default Output',
          type: 'elasticsearch',
          is_default: true,
          is_default_monitoring: true,
          hosts: [`https://${hostIp}:${EDR_REAL_FLEET_ES_PORT}`],
          ca_trusted_fingerprint: CA_TRUSTED_FINGERPRINT,
          config: {
            ssl: {
              verification_mode: 'none',
            },
          },
        },
      ])}`,
      // Agents page stays usable before Fleet Server has registered, matching
      // Defend Workflows Cypress serverless (`defend_workflows_cypress/serverless_config.ts`).
      '--xpack.fleet.internal.fleetServerStandalone=true',
      // This set only serves the real-fleet pipeline. The default 60s interval
      // makes the artifact revision check wait a full packager cycle.
      '--xpack.securitySolution.packagerTaskInterval=5s',
    ],
  },
};
