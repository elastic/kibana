/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { resolve } from 'path';
import { REPO_ROOT } from '@kbn/repo-info';
import type { ScoutServerConfig } from '../../../../../types';
import { servers as uiamConfig } from '../../uiam_local/serverless/search.serverless.config';
import {
  serviceAccountsServerArgs,
  serviceAccountsUiamEphemeralTokenExpiration,
  serviceAccountsUiamServerArgs,
} from '../shared';

// Reuse the local UIAM stack with service accounts enabled for Serverless integration tests.
export const servers: ScoutServerConfig = {
  ...uiamConfig,
  esServerlessOptions: {
    ...uiamConfig.esServerlessOptions,
    uiam: true,
    uiamEphemeralTokenExpiration: serviceAccountsUiamEphemeralTokenExpiration,
  },
  kbnTestServer: {
    ...uiamConfig.kbnTestServer,
    serverArgs: [
      ...uiamConfig.kbnTestServer.serverArgs,
      ...serviceAccountsServerArgs,
      ...serviceAccountsUiamServerArgs,
      // Exercise the managed plugin API through the Workflows example's HTTP endpoints.
      `--plugin-path=${resolve(REPO_ROOT, 'examples/developer_examples')}`,
      `--plugin-path=${resolve(REPO_ROOT, 'examples/workflows_extensions_example')}`,
    ],
  },
};
