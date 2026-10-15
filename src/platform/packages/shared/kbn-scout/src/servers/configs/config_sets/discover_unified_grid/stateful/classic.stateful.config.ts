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
 * Scout server configuration that boots Discover with the classic EuiDataGrid (UnifiedDataTable)
 * by setting `discover.enableTanstackTable=false`, so the Discover data grid suites cover both grids.
 * The flag is read when Discover renders its grid, so it must be present before any test runs.
 *
 * Start servers:
 *   node scripts/scout.js start-server --arch stateful --domain classic --serverConfigSet discover_unified_grid
 *
 * Run tests:
 *   node scripts/scout.js run-tests --arch stateful --domain classic \
 *     --config src/platform/plugins/shared/discover/test/scout_discover_unified_grid/data_grid/ui/parallel.playwright.config.ts
 */
export const servers: ScoutServerConfig = {
  ...defaultConfig,
  kbnTestServer: {
    ...defaultConfig.kbnTestServer,
    serverArgs: [
      ...defaultConfig.kbnTestServer.serverArgs,
      '--feature_flags.overrides.discover.enableTanstackTable=false',
    ],
  },
};
