/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { MOCK_IDP_UIAM_SERVICE_URL, MOCK_IDP_UIAM_SHARED_SECRET } from '@kbn/mock-idp-utils';
import { resolve } from 'path';
import { REPO_ROOT } from '@kbn/repo-info';
import { servers as defaultConfig } from '../../default/serverless/security_complete.serverless.config';
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
      // We need to test certain APIs that are only exposed by the plugin contract and not through
      // any HTTP endpoint, so this test plugin exposes these APIs through test HTTP endpoints that
      // we can call in our tests.
      `--plugin-path=${resolve(
        REPO_ROOT,
        'x-pack/platform/test/security_functional/plugins/test_endpoints'
      )}`,
      `--xpack.security.uiam.enabled=true`,
      `--xpack.security.uiam.url=${MOCK_IDP_UIAM_SERVICE_URL}`,
      `--xpack.security.uiam.sharedSecret=${MOCK_IDP_UIAM_SHARED_SECRET}`,
    ],
  },
};
