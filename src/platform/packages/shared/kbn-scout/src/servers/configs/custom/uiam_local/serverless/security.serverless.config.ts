/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { MOCK_IDP_UIAM_SERVICE_URL, MOCK_IDP_UIAM_SHARED_SECRET } from '@kbn/mock-idp-utils';
import { servers as defaultConfig } from '../../../default/serverless/security.serverless.config';
import type { ScoutServerConfig } from '../../../../../types';

// Indicates whether the config is used on CI or locally.
const isRunOnCI = process.env.CI;

export const servers: ScoutServerConfig = {
  ...defaultConfig,
  esServerlessOptions: { uiam: true },
  kbnTestServer: {
    ...defaultConfig.kbnTestServer,
    serverArgs: [
      ...defaultConfig.kbnTestServer.serverArgs,
      ...(isRunOnCI ? [] : ['--mockIdpPlugin.uiam.enabled=true']),
      `--xpack.security.uiam.enabled=true`,
      `--xpack.security.uiam.url=${MOCK_IDP_UIAM_SERVICE_URL}`,
      `--xpack.security.uiam.sharedSecret=${MOCK_IDP_UIAM_SHARED_SECRET}`,
    ],
  },
};
