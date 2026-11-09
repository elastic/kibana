/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutServerConfig } from '../../../../../types';
import { servers as defaultConfig } from '../../default/serverless/security_complete.serverless.config';
import { esMaxResponseSizeServerArgs } from '../shared';

/**
 * Scout server config for tests exercising Kibana behaviour when Elasticsearch responses exceed
 * `elasticsearch.maxResponseSize`. Serverless ships with a 100mb limit, which is too large for tests to hit.
 *
 * Usage:
 *   node scripts/scout.js start-server --arch serverless --domain security_complete --serverConfigSet es_max_response_size
 */
export const servers: ScoutServerConfig = {
  ...defaultConfig,
  kbnTestServer: {
    ...defaultConfig.kbnTestServer,
    serverArgs: [...defaultConfig.kbnTestServer.serverArgs, ...esMaxResponseSizeServerArgs],
  },
};
