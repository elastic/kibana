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
 * - Pre-installation of the osquery_manager integration at Kibana startup
 */
export const servers: ScoutServerConfig = {
  ...securityServerlessConfig,

  kbnTestServer: {
    ...securityServerlessConfig.kbnTestServer,
    serverArgs: [
      ...securityServerlessConfig.kbnTestServer.serverArgs,
      // Pre-install osquery_manager integration at Kibana startup
      '--xpack.fleet.packages.0.name=osquery_manager',
      '--xpack.fleet.packages.0.version=latest',
    ],
  },
};
