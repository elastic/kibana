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
 * Scout server configuration for Snapshot & Restore tests that need on-prem repository types.
 *
 * The default stateful config sets `--xpack.cloud.id`, which makes the Cloud plugin report
 * `isCloudEnabled`. The plugin's `repository_types` route then drops `ON_PREM_REPOSITORY_TYPES`
 * (fs/url), so the register-repository wizard never offers the `fs` type. That setting is read at
 * setup and cannot be toggled at runtime, so this config set removes it — reproducing the on-prem
 * environment the migrated FTR suite ran in.
 *
 * Start servers:
 *   node scripts/scout.js start-server --arch stateful --domain classic \
 *     --serverConfigSet snapshot_restore_onprem
 *
 * Run tests:
 *   node scripts/scout.js run-tests --arch stateful --domain classic \
 *     --serverConfigSet snapshot_restore_onprem \
 *     --config x-pack/platform/plugins/private/snapshot_restore/test/scout_snapshot_restore_onprem/ui/playwright.config.ts
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
