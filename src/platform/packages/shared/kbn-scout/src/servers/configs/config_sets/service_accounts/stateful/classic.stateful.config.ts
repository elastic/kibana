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
import { servers as defaultConfig } from '../../default/stateful/classic.stateful.config';
import { serviceAccountsServerArgs } from '../shared';

/**
 * Stateful only. Serverless runs the UIAM backend, and Elasticsearch's user-managed service
 * accounts are deliberately unavailable there.
 */
export const servers: ScoutServerConfig = {
  ...defaultConfig,
  esTestCluster: {
    ...defaultConfig.esTestCluster,
    serverArgs: [
      ...defaultConfig.esTestCluster.serverArgs,
      'xpack.security.authc.token.timeout=15s',
    ],
  },
  kbnTestServer: {
    ...defaultConfig.kbnTestServer,
    serverArgs: [
      ...defaultConfig.kbnTestServer.serverArgs,
      ...serviceAccountsServerArgs,
      `--plugin-path=${resolve(
        REPO_ROOT,
        'x-pack/platform/test/security_api_integration/plugins/service_accounts'
      )}`,
    ],
  },
};
