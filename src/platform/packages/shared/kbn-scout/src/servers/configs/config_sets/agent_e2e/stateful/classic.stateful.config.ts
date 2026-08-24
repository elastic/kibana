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

/**
 * Scout server config for Synthetics suites that enroll a real Elastic Agent
 * in Docker. Default Scout Fleet output is `localhost`, which a container
 * cannot reach — rewrite it to `host.docker.internal` and advertise Fleet
 * Server at `http://host.docker.internal:8220` so enrolled containers keep
 * checking in through the published port.
 *
 * Specs must live under `test/scout_agent_e2e/` so `detectCustomConfigDir`
 * resolves to this set.
 *
 *   node scripts/scout start-server --arch stateful --domain classic --serverConfigSet agent_e2e
 */
const replacePrefixedArg = (args: string[], prefix: string, next: string): string[] =>
  args.map((arg) => (arg.startsWith(prefix) ? next : arg));

const esPort = defaultConfig.servers.elasticsearch.port;

export const servers: ScoutServerConfig = {
  ...defaultConfig,
  kbnTestServer: {
    ...defaultConfig.kbnTestServer,
    serverArgs: replacePrefixedArg(
      replacePrefixedArg(
        defaultConfig.kbnTestServer.serverArgs,
        '--xpack.fleet.outputs=',
        `--xpack.fleet.outputs=${JSON.stringify([
          {
            id: 'es-default-output',
            name: 'Default Output',
            type: 'elasticsearch',
            is_default: true,
            is_default_monitoring: true,
            hosts: [`http://host.docker.internal:${esPort}`],
          },
        ])}`
      ),
      '--xpack.fleet.fleetServerHosts=',
      `--xpack.fleet.fleetServerHosts=${JSON.stringify([
        {
          id: 'default-fleet-server',
          name: 'Default Fleet Server',
          is_default: true,
          host_urls: ['http://host.docker.internal:8220'],
        },
      ])}`
    ),
  },
};
