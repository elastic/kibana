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
import {
  EDR_REAL_FLEET_ES_PORT,
  EDR_REAL_FLEET_SERVER_PORT,
  getEdrRealFleetHostIp,
} from '../shared';

/**
 * Stateful Scout servers for live Elastic Defend enrollment.
 *
 * Fleet Server is started later from the Playwright worker fixture
 * (`startFleetServer()`). These args make Kibana and ES reachable from
 * Docker Fleet Server and the Endpoint VM — the same advertise-address
 * pattern as Defend Workflows Cypress (`defend_workflows_cypress/config.ts`).
 *
 *   node scripts/scout start-server --arch stateful --domain classic --serverConfigSet edr_real_fleet
 */
const hostIp = getEdrRealFleetHostIp();

const isDefaultFleetAdvertiseArg = (arg: string): boolean =>
  arg.startsWith('--xpack.fleet.fleetServerHosts=') || arg.startsWith('--xpack.fleet.outputs=');

export const servers: ScoutServerConfig = {
  ...defaultConfig,

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
          hosts: [`http://${hostIp}:${EDR_REAL_FLEET_ES_PORT}`],
        },
      ])}`,
    ],
  },
};
