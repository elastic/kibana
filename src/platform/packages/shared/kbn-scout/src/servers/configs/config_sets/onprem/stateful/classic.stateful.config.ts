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
 * Scout server configuration for tests that need an on-prem (not cloud-enabled) deployment.
 *
 * The default stateful config sets `--xpack.cloud.id`, which makes the Cloud plugin report
 * `isCloudEnabled`. That setting is read at setup and cannot be toggled at runtime, so this
 * config set removes it. Tests under `test/scout_onprem/` run against it, for example Snapshot &
 * Restore's on-prem repository types (fs/url) and the self-managed subscription status badge.
 *
 * Start servers:
 *   node scripts/scout.js start-server --arch stateful --domain classic --serverConfigSet onprem
 *
 * Run tests (the config set is derived from the `scout_onprem` directory):
 *   node scripts/scout.js run-tests --arch stateful --domain classic \
 *     --config x-pack/platform/plugins/private/snapshot_restore/test/scout_onprem/ui/playwright.config.ts
 */
export const servers: ScoutServerConfig = {
  ...defaultConfig,

  kbnTestServer: {
    ...defaultConfig.kbnTestServer,
    serverArgs: defaultConfig.kbnTestServer.serverArgs.filter(
      (arg) => !arg.startsWith('--xpack.cloud.id')
    ),
  },
};
