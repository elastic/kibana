/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License, v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutServerConfig } from '../../../../../types';
import { servers as securityCompleteConfig } from '../../default/serverless/security_complete.serverless.config';
import {
  EDR_REAL_FLEET_ES_PORT,
  EDR_REAL_FLEET_SERVER_PORT,
  getEdrRealFleetHostIp,
} from '../shared';

/**
 * Local serverless Security complete for live Elastic Defend enrollment.
 * Cloud serverless is MKI and has no config here.
 *
 *   node scripts/scout start-server --location local --arch serverless --domain security_complete --serverConfigSet edr_real_fleet
 */
const hostIp = getEdrRealFleetHostIp();

const isDefaultFleetAdvertiseArg = (arg: string): boolean =>
  arg.startsWith('--xpack.fleet.fleetServerHosts=') || arg.startsWith('--xpack.fleet.outputs=');

export const servers: ScoutServerConfig = {
  ...securityCompleteConfig,

  esTestCluster: {
    ...securityCompleteConfig.esTestCluster,
    serverArgs: [
      ...securityCompleteConfig.esTestCluster.serverArgs,
      // Docker Fleet Server and the Endpoint VM cannot reach ES on localhost.
      'http.host=0.0.0.0',
    ],
  },

  kbnTestServer: {
    ...securityCompleteConfig.kbnTestServer,
    serverArgs: [
      ...securityCompleteConfig.kbnTestServer.serverArgs.filter(
        (arg) => !isDefaultFleetAdvertiseArg(arg)
      ),
      `--xpack.fleet.fleetServerHosts=${JSON.stringify([
        {
          id: 'default-fleet-server',
          name: 'Default Fleet Server',
          is_default: true,
          host_urls: [`https://${hostIp}:${EDR_REAL_FLEET_SERVER_PORT}`],
        },
      ])}`,
      `--xpack.fleet.outputs=${JSON.stringify([
        {
          id: 'es-default-output',
          name: 'Default Output',
          type: 'elasticsearch',
          is_default: true,
          is_default_monitoring: true,
          hosts: [`https://${hostIp}:${EDR_REAL_FLEET_ES_PORT}`],
        },
      ])}`,
      '--xpack.securitySolution.packagerTaskInterval=5s',
    ],
  },
};
