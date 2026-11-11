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
import { serviceAccountsUiamServerArgs } from '../../service_accounts/shared';

// Significant events sets each space's detection engine up as a service account, which its API
// tests do in global setup. Serverless keeps service accounts off by default, and the account is a
// UIAM one here, so Task Manager must grant UIAM API keys for the rules it schedules.
export const servers: ScoutServerConfig = {
  ...defaultConfig,
  kbnTestServer: {
    ...defaultConfig.kbnTestServer,
    serverArgs: [
      ...defaultConfig.kbnTestServer.serverArgs,
      '--xpack.security.serviceAccounts.enabled=true',
      ...serviceAccountsUiamServerArgs,
    ],
  },
};
