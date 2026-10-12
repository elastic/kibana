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
 * Scout server config for the AlertZero suites (`alertzero/test/scout_alertzero`).
 *
 * `xpack.alertzero.enabled` defaults to false and is a boot-time plugin flag, so
 * these suites cannot run on the default set: with the plugin disabled, none of
 * its managed workflows are installed and nothing can assert on them.
 *
 * `agenticInvestigations` is in AlertZero's `requiredPlugins` and also defaults
 * to false; Kibana disables AlertZero when one of its required plugins is off.
 *
 * Usage:
 *   node scripts/scout.js start-server --arch stateful --domain classic --serverConfigSet alertzero
 */
export const servers: ScoutServerConfig = {
  ...defaultConfig,
  kbnTestServer: {
    ...defaultConfig.kbnTestServer,
    serverArgs: [
      ...defaultConfig.kbnTestServer.serverArgs,
      '--xpack.alertzero.enabled=true',
      '--xpack.agenticInvestigations.enabled=true',
    ],
  },
};
