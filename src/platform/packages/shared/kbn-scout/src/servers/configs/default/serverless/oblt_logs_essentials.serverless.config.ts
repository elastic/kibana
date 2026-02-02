/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { defaultConfig } from './serverless.base.config';
import type { ScoutServerConfig } from '../../../../types';

export const servers: ScoutServerConfig = {
  ...defaultConfig,
  esTestCluster: {
    ...defaultConfig.esTestCluster,
    serverArgs: [
      ...defaultConfig.esTestCluster.serverArgs,
      'xpack.apm_data.enabled=true',
      'serverless.project_type=observability',
      'serverless.observability.tier=logs_essentials',
    ],
  },
  kbnTestServer: {
    ...defaultConfig.kbnTestServer,
    serverArgs: [
      ...defaultConfig.kbnTestServer.serverArgs,
      '--serverless=oblt',
      '--coreApp.allowDynamicConfigOverrides=true',
      '--xpack.uptime.service.manifestUrl=mockDevUrl',
      `--pricing.tiers.products=${JSON.stringify([
        { name: 'observability', tier: 'logs_essentials' },
      ])}`,
    ],
  },
};
