/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutServerConfig } from '../../../../../types';
import { servers as defaultConfig } from '../../default/stateful/classic.stateful.config';

/**
 * Scout server config for `security_solution/test/scout_alertzero`.
 *
 * AlertZero is a deployment-level plugin gate (`xpack.alertzero.enabled`,
 * default `false`). With it off the plugin registers no managed-workflow owner,
 * so neither the global rule workflows nor any per-space Worker is installed and
 * the workflows API answers 404. The `default` config set does not enable it, so
 * every suite asserting on AlertZero-managed workflows has to run on this set.
 *
 * Usage:
 *   node scripts/scout.js start-server --arch stateful --domain classic --serverConfigSet alertzero
 */
export const servers: ScoutServerConfig = {
  ...defaultConfig,
  kbnTestServer: {
    ...defaultConfig.kbnTestServer,
    serverArgs: [...defaultConfig.kbnTestServer.serverArgs, '--xpack.alertzero.enabled=true'],
  },
};
