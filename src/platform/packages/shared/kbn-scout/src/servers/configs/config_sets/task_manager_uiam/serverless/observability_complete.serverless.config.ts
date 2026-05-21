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

// Enables Task Manager UIAM rollout flags so the EsAndUiamApiKeyStrategy and
// background provisioning task are exercised. Flags are not yet enabled on MKI,
// so these tests run only on Kibana CI (not on MKI).
export const servers: ScoutServerConfig = {
  ...defaultConfig,
  kbnTestServer: {
    ...defaultConfig.kbnTestServer,
    serverArgs: [
      ...defaultConfig.kbnTestServer.serverArgs,
      '--xpack.task_manager.grant_uiam_api_keys=true',
      // Schedules task_manager:uiam_api_key_provisioning so background conversion can run in Scout.
      '--feature_flags.overrides.taskManager.provisionUiamApiKeys=true',
    ],
  },
};
