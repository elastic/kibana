/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutServerConfig } from '../../../../../types';
import { defaultConfig } from '../../default/stateful/base.config';

/**
 * Fixed port for the in-repo GitHub-style plugin mock used by Agent Builder plugin install tests.
 * Kept in sync with `SCOUT_AGENT_BUILDER_GITHUB_MOCK_PORT` in Agent Builder Scout API fixtures.
 */
const AGENT_BUILDER_GITHUB_MOCK_PORT = 18387;

/**
 * Stateful Kibana + Elasticsearch defaults with Agent Builder API test settings:
 * experimental Agent Builder UI flags, verbose Agent Builder plugin logging, and
 * `xpack.agentBuilder.githubBaseUrl` pointing at the local plugin registry mock.
 */
export const servers: ScoutServerConfig = {
  ...defaultConfig,
  kbnTestServer: {
    ...defaultConfig.kbnTestServer,
    serverArgs: [
      ...defaultConfig.kbnTestServer.serverArgs,
      `--logging.loggers=${JSON.stringify([
        {
          name: 'plugins.agentBuilder',
          level: 'all',
          appenders: ['default'],
        },
      ])}`,
      '--uiSettings.overrides.agentBuilder:experimentalFeatures=true',
      `--xpack.agentBuilder.githubBaseUrl=http://localhost:${AGENT_BUILDER_GITHUB_MOCK_PORT}`,
    ],
  },
};
