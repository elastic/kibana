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
  EDR_REAL_FLEET_ES_PORT as FLEET_REAL_AGENT_ES_PORT,
  getEdrRealFleetHostIp as getFleetRealAgentHostIp,
} from '../../edr_real_fleet/shared';

// Not 8220, which a Fleet Server started for local development usually holds.
const FLEET_REAL_AGENT_SERVER_PORT = 8221;

/**
 * Stateful Scout servers for Fleet tests that enroll a real Elastic Agent.
 *
 * Fleet Server and the agents are started from the Playwright worker fixture, as Docker
 * containers. These args make Kibana and ES reachable from them, with the same advertise-address
 * pattern as `edr_real_fleet`, and turn on the sentinel policy version with a short assignment
 * task interval so tests do not wait a minute for agents to be moved.
 *
 *   node scripts/scout start-server --arch stateful --domain classic --serverConfigSet fleet_real_agent
 */
const hostIp = getFleetRealAgentHostIp();

const isDefaultFleetAdvertiseArg = (arg: string): boolean =>
  arg.startsWith('--xpack.fleet.fleetServerHosts=') || arg.startsWith('--xpack.fleet.outputs=');

export const servers: ScoutServerConfig = {
  ...defaultConfig,

  esTestCluster: {
    ...defaultConfig.esTestCluster,
    serverArgs: [
      ...defaultConfig.esTestCluster.serverArgs,
      // Docker containers cannot reach ES on localhost.
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
          host_urls: [`https://${hostIp}:${FLEET_REAL_AGENT_SERVER_PORT}`],
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
          hosts: [`http://${hostIp}:${FLEET_REAL_AGENT_ES_PORT}`],
        },
      ])}`,
      '--feature_flags.overrides.fleet.enableSentinelPolicyVersion=true',
      '--xpack.fleet.versionSpecificPolicyAssignment.taskInterval=5s',
    ],
  },
};
