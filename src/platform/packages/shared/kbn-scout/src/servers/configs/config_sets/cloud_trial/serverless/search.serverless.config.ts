/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { servers as defaultConfig } from '../../default/serverless/search.serverless.config';
import type { ScoutServerConfig } from '../../../../../types';

/**
 * Serverless Elasticsearch project whose organization is in trial, on AWS us-east-1.
 * `xpack.cloud.serverless.in_trial` is read at boot, so it can't be toggled at runtime.
 */
export const servers: ScoutServerConfig = {
  ...defaultConfig,
  kbnTestServer: {
    ...defaultConfig.kbnTestServer,
    serverArgs: [
      ...defaultConfig.kbnTestServer.serverArgs,
      '--xpack.cloud.serverless.in_trial=true',
      '--xpack.cloud.csp=aws',
      '--xpack.cloud.region=us-east-1',
    ],
  },
};
