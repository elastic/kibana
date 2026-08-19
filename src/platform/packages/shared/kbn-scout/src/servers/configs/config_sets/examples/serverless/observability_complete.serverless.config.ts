/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { servers as defaultConfig } from '../../default/serverless/observability_complete.serverless.config';
import type { ScoutServerConfig } from '../../../../../types';
import { examplesPluginPathArgs } from '../shared';

/**
 * Scout server config for example-plugin tests on local serverless Observability complete.
 *
 * Usage:
 *   node scripts/scout.js start-server --arch serverless --domain observability_complete --serverConfigSet examples
 */
export const servers: ScoutServerConfig = {
  ...defaultConfig,
  kbnTestServer: {
    ...defaultConfig.kbnTestServer,
    serverArgs: [...defaultConfig.kbnTestServer.serverArgs, ...examplesPluginPathArgs],
  },
};
