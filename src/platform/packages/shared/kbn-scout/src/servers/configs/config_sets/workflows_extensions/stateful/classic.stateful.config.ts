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
 * Scout server config for workflows_extensions trigger-approval tests
 * (`test/scout_workflows_extensions`). Turns on plugins that register
 * event-driven triggers in `setup()` so the approval catalog is complete.
 *
 * Alerting v2 and Significant Events already default to enabled on stateful;
 * do not add those flags here. Nightshift defaults to disabled, so it is
 * enabled for this suite. Add further `--xpack.<plugin>.enabled=true` args
 * when a new publisher is gated the same way.
 *
 * Scout selects this set because the Playwright config lives under
 * `test/scout_workflows_extensions/`.
 *
 * Usage:
 *   node scripts/scout.js start-server --arch stateful --domain classic --serverConfigSet workflows_extensions
 */
export const servers: ScoutServerConfig = {
  ...defaultConfig,
  kbnTestServer: {
    ...defaultConfig.kbnTestServer,
    serverArgs: [
      ...defaultConfig.kbnTestServer.serverArgs,
      '--xpack.nightshift_investigations.enabled=true',
    ],
  },
};
