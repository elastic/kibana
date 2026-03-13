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
 * Custom Scout server configuration for Osquery tests.
 *
 * This configuration enables:
 * - ES binding to all interfaces (http.host=0.0.0.0) so Docker containers
 *   on the `elastic` network can reach Elasticsearch via host.docker.internal
 * - Fleet Server and output hosts pointing to host.docker.internal so Docker-based
 *   Fleet Server and Elastic Agents can communicate with the stack
 * - Pre-installation of the osquery_manager integration at Kibana startup
 *
 * Note: We override xpack.fleet.fleetServerHosts and xpack.fleet.outputs (rather than
 * xpack.fleet.agents.elasticsearch.host) because the default config already defines
 * xpack.fleet.outputs and the two settings are mutually exclusive.
 *
 * This config is automatically used when running tests from:
 * osquery/test/scout_osquery/
 */
// Filter out default settings that we override:
// - Fleet host settings: Docker containers cannot resolve localhost back to the host machine
// - Auth provider/selector settings: use basic auth as primary so localhost:5620 doesn't
//   enter a SAML redirect loop when accessed manually in a browser
const kbnServerArgsFiltered = defaultConfig.kbnTestServer.serverArgs.filter(
  (arg: string) =>
    !arg.startsWith('--xpack.fleet.fleetServerHosts=') &&
    !arg.startsWith('--xpack.fleet.outputs=') &&
    !arg.startsWith('--xpack.security.authc.selector.enabled=') &&
    !arg.startsWith('--xpack.security.authc.providers=')
);

export const servers: ScoutServerConfig = {
  ...defaultConfig,

  esTestCluster: {
    ...defaultConfig.esTestCluster,
    serverArgs: [
      ...defaultConfig.esTestCluster.serverArgs,
      // Allow Docker containers on the `elastic` network to reach ES
      'http.host=0.0.0.0',
    ],
  },

  kbnTestServer: {
    ...defaultConfig.kbnTestServer,
    serverArgs: [
      ...kbnServerArgsFiltered,
      // Basic auth as primary provider so localhost:5620 is accessible without SAML redirect loop
      `--xpack.security.authc.providers=${JSON.stringify({
        basic: { 'cloud-basic': { order: 0 } },
        saml: { 'cloud-saml-kibana': { order: 1, realm: 'cloud-saml-kibana' } },
      })}`,
      // Fleet Server hosts pointing to host.docker.internal so Docker agents can reach it
      `--xpack.fleet.fleetServerHosts=${JSON.stringify([
        {
          id: 'default-fleet-server',
          name: 'Default Fleet Server',
          is_default: true,
          host_urls: ['https://host.docker.internal:8220'],
        },
      ])}`,
      // Default output pointing to host.docker.internal so Docker agents can reach ES
      `--xpack.fleet.outputs=${JSON.stringify([
        {
          id: 'es-default-output',
          name: 'Default Output',
          type: 'elasticsearch',
          is_default: true,
          is_default_monitoring: true,
          hosts: [`http://host.docker.internal:${defaultConfig.servers.elasticsearch.port}`],
        },
      ])}`,
      // Pre-install osquery_manager integration at Kibana startup
      '--xpack.fleet.packages.0.name=osquery_manager',
      '--xpack.fleet.packages.0.version=latest',
    ],
  },
};
