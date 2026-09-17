/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { format as formatUrl } from 'url';
import type { ScoutServerConfig } from '../../../../../types';
import { defaultConfig } from '../../default/stateful/base.config';

// The plugin is disabled by default (xpack.agenticInvestigations.enabled),
// so its API tests run against a config set that turns it on (same pattern
// as `nightshift_investigations`).
//
// Ports are also shifted (ES 9220 -> 9420, Kibana 5620 -> 5720) so this
// suite's local run can boot its own dedicated stack side-by-side with
// another worktree's already-running default-port stack, instead of
// colliding on `BindException: Address already in use`.
const elasticsearch = { ...defaultConfig.servers.elasticsearch, port: 9420 };
const kibana = { ...defaultConfig.servers.kibana, port: 5720 };
const kbnUrl = `${kibana.protocol}://${kibana.hostname}:${kibana.port}`;

const PORT_DEPENDENT_ARG_PREFIXES = [
  '--server.port=',
  '--elasticsearch.hosts=',
  '--newsfeed.service.urlRoot=',
  '--server.publicBaseUrl=',
  '--xpack.fleet.outputs=',
];

export const servers: ScoutServerConfig = {
  ...defaultConfig,
  servers: {
    ...defaultConfig.servers,
    elasticsearch,
    kibana,
  },
  kbnTestServer: {
    ...defaultConfig.kbnTestServer,
    serverArgs: [
      ...defaultConfig.kbnTestServer.serverArgs.filter(
        (arg) => !PORT_DEPENDENT_ARG_PREFIXES.some((prefix) => arg.startsWith(prefix))
      ),
      `--server.port=${kibana.port}`,
      `--elasticsearch.hosts=${formatUrl(
        Object.fromEntries(
          Object.entries(elasticsearch).filter(([key]) => key.toLowerCase() !== 'auth')
        )
      )}`,
      `--newsfeed.service.urlRoot=${kbnUrl}`,
      `--server.publicBaseUrl=${kbnUrl}`,
      `--xpack.fleet.outputs=${JSON.stringify([
        {
          id: 'es-default-output',
          name: 'Default Output',
          type: 'elasticsearch',
          is_default: true,
          is_default_monitoring: true,
          hosts: [`${elasticsearch.protocol}://${elasticsearch.hostname}:${elasticsearch.port}`],
        },
      ])}`,
      // agentic_investigations is disabled by default; enable it for this suite.
      '--xpack.agenticInvestigations.enabled=true',
    ],
  },
};
