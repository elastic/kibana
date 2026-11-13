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

// The plugin is disabled by default (xpack.nightshiftDetection.enabled), so its tests run
// against a config set that turns it on.
export const servers: ScoutServerConfig = {
  ...defaultConfig,
  kbnTestServer: {
    ...defaultConfig.kbnTestServer,
    serverArgs: [
      ...defaultConfig.kbnTestServer.serverArgs,
      '--xpack.nightshiftDetection.enabled=true',
      // The engine runs only as the detection service account, which needs the feature on.
      '--xpack.security.serviceAccounts.enabled=true',
    ],
  },
};
