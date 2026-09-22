/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutServerConfig } from '../../../../../types';
import { servers as uiamConfig } from '../../uiam_local/serverless/search.serverless.config';
import { serviceAccountsServerArgs } from '../shared';

// Reuse the local UIAM stack with service accounts enabled for Serverless integration tests.
export const servers: ScoutServerConfig = {
  ...uiamConfig,
  kbnTestServer: {
    ...uiamConfig.kbnTestServer,
    serverArgs: [...uiamConfig.kbnTestServer.serverArgs, ...serviceAccountsServerArgs],
  },
};
