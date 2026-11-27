/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutServerConfig } from '../../../../../types';
import {
  serviceAccountsServerArgs,
  serviceAccountsUiamServerArgs,
} from '../../service_accounts/shared';
import { servers as uiamConfig } from '../../uiam_local/serverless/search.serverless.config';
import { inboundHubServerArgs } from '../shared';

/**
 * Local Search serverless stack. The Kibana dev certificate is a Search project
 * client, which is what UIAM accepts when exchanging a service-account bearer.
 * Task Manager grants the UIAM key the workflow then runs as.
 */
export const servers: ScoutServerConfig = {
  ...uiamConfig,
  kbnTestServer: {
    ...uiamConfig.kbnTestServer,
    serverArgs: [
      ...uiamConfig.kbnTestServer.serverArgs,
      ...inboundHubServerArgs,
      ...serviceAccountsServerArgs,
      ...serviceAccountsUiamServerArgs,
      '--feature_flags.overrides.taskManager.provisionUiamApiKeys=true',
    ],
  },
};
