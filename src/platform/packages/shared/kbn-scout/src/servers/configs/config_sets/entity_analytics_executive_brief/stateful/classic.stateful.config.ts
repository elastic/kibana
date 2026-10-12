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
 * Scout server config for the Entity Analytics executive brief API tests
 * (`security_solution/test/scout_entity_analytics_executive_brief`).
 *
 * The brief is gated by the `entityAnalyticsExecutiveBriefEnabled` experimental flag, which is
 * read at plugin setup (it decides route and task type registration), so it can't be toggled at
 * runtime. Remove this set and move the tests to `test/scout` when the flag is removed.
 *
 * Usage:
 *   node scripts/scout start-server --arch stateful --domain classic --serverConfigSet entity_analytics_executive_brief
 */
export const servers: ScoutServerConfig = {
  ...defaultConfig,
  kbnTestServer: {
    ...defaultConfig.kbnTestServer,
    serverArgs: [
      ...defaultConfig.kbnTestServer.serverArgs,
      `--xpack.securitySolution.enableExperimental=${JSON.stringify([
        'entityAnalyticsExecutiveBriefEnabled',
      ])}`,
    ],
  },
};
