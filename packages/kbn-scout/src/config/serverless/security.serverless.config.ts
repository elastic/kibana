/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ScoutLoaderConfig } from '../../types';
import { defaultConfig } from './serverless.base.config';

export const servers: ScoutLoaderConfig = {
  ...defaultConfig,
  esTestCluster: {
    ...defaultConfig.esTestCluster,
    serverArgs: [
      ...defaultConfig.esTestCluster.serverArgs,
      'xpack.security.authc.api_key.cache.max_keys=70000',
    ],
  },
  kbnTestServer: {
    serverArgs: [
      ...defaultConfig.kbnTestServer.serverArgs,
      '--serverless=security',
      '--coreApp.allowDynamicConfigOverrides=true',
      `--xpack.task_manager.unsafe.exclude_task_types=${JSON.stringify(['Fleet-Metrics-Task'])}`,
    ],
  },
};
