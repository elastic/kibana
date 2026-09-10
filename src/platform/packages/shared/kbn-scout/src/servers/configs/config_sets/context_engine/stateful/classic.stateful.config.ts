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
 * Context Engine is off by default. Pinning the flag at boot is required so
 * `agent_builder_sml` can register the managed `elastic` AI index during
 * plugin start (`putManaged` is skipped when the flag is still false).
 *
 * Scout selects this set because the Playwright config lives under
 * `test/scout_context_engine/`.
 *
 * Usage:
 *   node scripts/scout start-server --arch stateful --domain classic --serverConfigSet context_engine
 */
export const servers: ScoutServerConfig = {
  ...defaultConfig,
  kbnTestServer: {
    ...defaultConfig.kbnTestServer,
    serverArgs: [
      ...defaultConfig.kbnTestServer.serverArgs,
      '--uiSettings.overrides.contextEngine:enabled=true',
    ],
  },
};
