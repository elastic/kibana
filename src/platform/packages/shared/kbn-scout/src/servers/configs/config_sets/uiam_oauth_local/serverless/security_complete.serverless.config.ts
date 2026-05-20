/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { MOCK_IDP_UIAM_OAUTH_BASE_URL } from '@kbn/mock-idp-utils';
import { servers as uiamConfig } from '../../uiam_local/serverless/security_complete.serverless.config';
import type { ScoutServerConfig } from '../../../../../types';

export const servers: ScoutServerConfig = {
  ...uiamConfig,
  esServerlessOptions: {
    ...uiamConfig.esServerlessOptions!,
    uiamOAuth: true,
  },
  kbnTestServer: {
    ...uiamConfig.kbnTestServer,
    serverArgs: [
      ...uiamConfig.kbnTestServer.serverArgs,
      `--xpack.security.mcp.oauth2.metadata.authorization_servers=${JSON.stringify([
        MOCK_IDP_UIAM_OAUTH_BASE_URL,
      ])}`,
      `--xpack.security.mcp.oauth2.metadata.resource=http://localhost:5620`,
    ],
  },
};
