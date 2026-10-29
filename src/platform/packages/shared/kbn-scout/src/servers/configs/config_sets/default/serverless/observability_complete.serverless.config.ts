/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { defaultConfig } from './serverless.base.config';
import type { ScoutServerConfig } from '../../../../../types';

export const servers: ScoutServerConfig = {
  ...defaultConfig,
  esTestCluster: {
    ...defaultConfig.esTestCluster,
    serverArgs: [...defaultConfig.esTestCluster.serverArgs, 'xpack.apm_data.enabled=true'],
  },
  kbnTestServer: {
    ...defaultConfig.kbnTestServer,
    serverArgs: [
      ...defaultConfig.kbnTestServer.serverArgs,
      '--serverless=oblt',
      '--coreApp.allowDynamicConfigOverrides=true',
      // Synthetics service config — matches the FTR deployment-agnostic serverless base
      // so the Elastic-managed `dev` public location is available for Synthetics API tests.
      '--xpack.uptime.service.password=test',
      '--xpack.uptime.service.username=localKibanaIntegrationTestsUser',
      '--xpack.uptime.service.devUrl=mockDevUrl',
      '--xpack.uptime.service.manifestUrl=mockDevUrl',
      // The Nightshift detection engine only runs as a service account, and its Significant Events
      // API tests set a space up to do so. UIAM is already on in the base Serverless config.
      '--xpack.security.serviceAccounts.enabled=true',
      // A UIAM service account that schedules a task gets a UIAM API key and no Elasticsearch key,
      // and Task Manager only grants UIAM keys when this is on.
      '--xpack.task_manager.grant_uiam_api_keys=true',
    ],
  },
};
