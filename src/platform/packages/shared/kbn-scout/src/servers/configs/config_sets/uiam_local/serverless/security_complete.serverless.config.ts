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
import { servers as defaultConfig } from '../../default/serverless/security_complete.serverless.config';
import type { ScoutServerConfig } from '../../../../../types';

// We need to test certain APIs that are only exposed by the plugin contract and not through
// any HTTP endpoint, so this test plugin exposes these APIs through test HTTP endpoints that
// we can call in our tests.
const pluginPath = `--plugin-path=${resolve(
  REPO_ROOT,
  'x-pack/platform/test/security_functional/plugins/test_endpoints'
)}`;

export const servers: ScoutServerConfig = {
  ...defaultConfig,
  kbnTestServer: {
    ...defaultConfig.kbnTestServer,
    serverArgs: [...defaultConfig.kbnTestServer.serverArgs, pluginPath],
  },
};
