/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutServerConfig } from '../../../../../types';
import { securityAuditServerlessConfig } from './serverless.base.config';

export const servers: ScoutServerConfig = {
  ...securityAuditServerlessConfig,
  esTestCluster: {
    ...securityAuditServerlessConfig.esTestCluster,
    serverArgs: [
      ...securityAuditServerlessConfig.esTestCluster.serverArgs,
      'xpack.security.authc.api_key.cache.max_keys=70000',
    ],
  },
  kbnTestServer: {
    ...securityAuditServerlessConfig.kbnTestServer,
    serverArgs: [
      ...securityAuditServerlessConfig.kbnTestServer.serverArgs,
      '--serverless=security',
      '--coreApp.allowDynamicConfigOverrides=true',
      `--xpack.task_manager.unsafe.exclude_task_types=${JSON.stringify(['Fleet-Metrics-Task'])}`,
    ],
  },
};
