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
 * Scout server config for the threat intel API tests
 * (`security_solution/test/scout_threat_intel`).
 *
 * `threatIntelSupplyEnabled` gates route registration in the Security Solution
 * plugin's `setup()`, so without it every threat intel route 404s and the suite
 * fails against Kibana's generic route-not-found rather than the handlers under
 * test. The flag belongs here and not in the default set: it also arms the
 * plugin's `start()` bootstrap (index templates, catalog seeding), which every
 * other stateful suite would otherwise pay for and none of them need.
 *
 * Scout selects this set because the Playwright config lives under
 * `test/scout_threat_intel/`.
 *
 * Usage:
 *   node scripts/scout.js start-server --arch stateful --domain classic --serverConfigSet threat_intel
 */
export const servers: ScoutServerConfig = {
  ...defaultConfig,
  kbnTestServer: {
    ...defaultConfig.kbnTestServer,
    serverArgs: [
      ...defaultConfig.kbnTestServer.serverArgs,
      `--xpack.securitySolution.enableExperimental=${JSON.stringify(['threatIntelSupplyEnabled'])}`,
    ],
  },
};
