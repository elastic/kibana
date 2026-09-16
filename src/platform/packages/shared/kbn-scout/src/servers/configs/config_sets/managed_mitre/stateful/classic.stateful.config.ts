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
 * Scout server config for the managed MITRE UI tests
 * (`security_solution/test/scout_managed_mitre`).
 *
 * `xpack.mitreAttack.managedSourceEnabled` is a plain plugin config flag (not
 * `dynamicConfig`) that gates SO-type registration, route registration, and the
 * MITRE entity population in the `mitre_attack` plugin's `setup()` / `start()`
 * hooks. The flag therefore cannot be toggled at runtime via
 * `apiServices.core.settings()` — it must be present at Kibana boot.
 *
 * This config set is a temporary home for these tests. Once
 * `managedSourceEnabled` defaults to `true` and the legacy static blob is
 * removed (https://github.com/elastic/security-team/issues/19076), this entire
 * config set and suite directory can be merged into the default scout suite and
 * deleted.
 *
 * Scout selects this set because the Playwright config lives under
 * `test/scout_managed_mitre/`.
 *
 * Usage:
 *   node scripts/scout.js start-server --arch stateful --domain classic --serverConfigSet managed_mitre
 */
export const servers: ScoutServerConfig = {
  ...defaultConfig,
  kbnTestServer: {
    ...defaultConfig.kbnTestServer,
    serverArgs: [
      ...defaultConfig.kbnTestServer.serverArgs,
      '--xpack.mitreAttack.managedSourceEnabled=true',
    ],
  },
};
